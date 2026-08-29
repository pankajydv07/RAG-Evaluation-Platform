"""CI/CD Regression Evaluation Gate runner.

Runs golden dataset evaluation and asserts metrics against version-controlled thresholds.
"""

import asyncio
import io
import json
import os
import sys
import yaml
from rich.console import Console
from rich.table import Table
from ragapp.core.database import get_session_factory
from ragapp.evaluation.judge import LLMJudge
from ragapp.generation.generator import RAGGenerator
from ragapp.providers.factory import get_embedding_provider, get_llm_provider
from ragapp.repositories.collection_repo import CollectionRepository
from ragapp.repositories.vector_repo import VectorRepository
from ragapp.retrieval.reranker import PassageReranker

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

console = Console(highlight=False)


async def run_evaluation_gate(
    dataset_path: str = "ragapp/eval/golden_dataset.json",
    thresholds_path: str = "eval/thresholds.yml",
) -> bool:
    """Execute evaluation gate across golden dataset and assert thresholds."""
    if not os.path.exists(dataset_path):
        console.print(f"[bold red]Golden dataset file not found: {dataset_path}[/bold red]")
        return False

    with open(dataset_path, "r", encoding="utf-8") as f:
        items = json.load(f)

    # Load thresholds
    thresholds = {
        "faithfulness": 0.85,
        "answer_relevance": 0.80,
        "context_precision": 0.75,
        "max_avg_latency_ms": 25000.0,
    }
    if os.path.exists(thresholds_path):
        with open(thresholds_path, "r", encoding="utf-8") as f:
            t_data = yaml.safe_load(f)
            if t_data and "thresholds" in t_data:
                thresholds.update(t_data["thresholds"])

    console.print(f"\n[bold cyan]=== Running RAG Quality Regression Gate on {len(items)} Golden Items ===[/bold cyan]")

    session_factory = get_session_factory()
    scores: list[dict] = []

    async with session_factory() as session:
        col_repo = CollectionRepository(session)
        vec_repo = VectorRepository(session)
        embedding_provider = get_embedding_provider()
        llm_provider = get_llm_provider(role="generator")
        judge_provider = get_llm_provider(role="judge")
        reranker = PassageReranker()
        generator = RAGGenerator(llm_provider)
        judge = LLMJudge(judge_provider)

        for i, item in enumerate(items, 1):
            q = item["question"]
            c_name = item["collection_name"]
            console.print(f"[{i}/{len(items)}] Evaluating: [dim]{q}[/dim]")

            col = await col_repo.get_by_name(c_name)
            if not col:
                console.print(f"  [red]Collection '{c_name}' not found, skipping[/red]")
                continue

            query_emb = await embedding_provider.embed_query(q)
            passages = await vec_repo.search_similar(col.id, query_emb, limit=10)
            if passages:
                reranked = await reranker.rerank(q, passages, top_k=5)
                final_passages = [r.search_result for r in reranked]
            else:
                final_passages = []

            gen_res = await generator.generate_answer(q, final_passages)
            context_texts = [p.text for p in final_passages]

            eval_score = await judge.evaluate_trace(
                query=q,
                context_texts=context_texts,
                generated_answer=gen_res.answer,
            )

            scores.append({
                "id": item.get("id", f"Q{i}"),
                "faithfulness": eval_score.faithfulness,
                "answer_relevance": eval_score.answer_relevance,
                "context_precision": eval_score.context_precision,
                "latency_ms": gen_res.latency_ms,
            })

    if not scores:
        console.print("[bold red]No items could be evaluated.[/bold red]")
        return False

    # Compute means
    mean_faith = sum(s["faithfulness"] for s in scores) / len(scores)
    mean_rel = sum(s["answer_relevance"] for s in scores) / len(scores)
    mean_prec = sum(s["context_precision"] for s in scores) / len(scores)
    avg_latency = sum(s["latency_ms"] for s in scores) / len(scores)

    # Print Summary Table
    table = Table(title="CI/CD Evaluation Gate Results")
    table.add_column("Metric", style="bold cyan")
    table.add_column("Measured Score", justify="right")
    table.add_column("Threshold Target", justify="right")
    table.add_column("Status", justify="center")

    pass_faith = mean_faith >= thresholds["faithfulness"]
    pass_rel = mean_rel >= thresholds["answer_relevance"]
    pass_prec = mean_prec >= thresholds["context_precision"]
    pass_lat = avg_latency <= thresholds["max_avg_latency_ms"]

    table.add_row(
        "Faithfulness (Mean)",
        f"{mean_faith:.3f}",
        f"{thresholds['faithfulness']:.2f}",
        "[green]PASS[/green]" if pass_faith else "[red]FAIL[/red]",
    )
    table.add_row(
        "Answer Relevance (Mean)",
        f"{mean_rel:.3f}",
        f"{thresholds['answer_relevance']:.2f}",
        "[green]PASS[/green]" if pass_rel else "[red]FAIL[/red]",
    )
    table.add_row(
        "Context Precision (Mean)",
        f"{mean_prec:.3f}",
        f"{thresholds['context_precision']:.2f}",
        "[green]PASS[/green]" if pass_prec else "[red]FAIL[/red]",
    )
    table.add_row(
        "Avg Query Latency",
        f"{avg_latency:.1f} ms",
        f"{thresholds['max_avg_latency_ms']:.0f} ms",
        "[green]PASS[/green]" if pass_lat else "[red]FAIL[/red]",
    )

    console.print(table)

    all_passed = pass_faith and pass_rel and pass_prec and pass_lat
    if all_passed:
        console.print("\n[bold green]✓ EVALUATION GATE PASSED — Quality meets all regression thresholds.[/bold green]\n")
    else:
        console.print("\n[bold red]✗ EVALUATION GATE FAILED — Quality degraded below required thresholds.[/bold red]\n")

    return all_passed


if __name__ == "__main__":
    d_path = sys.argv[1] if len(sys.argv) > 1 else "ragapp/eval/golden_dataset.json"
    t_path = sys.argv[2] if len(sys.argv) > 2 else "eval/thresholds.yml"
    success = asyncio.run(run_evaluation_gate(dataset_path=d_path, thresholds_path=t_path))
    sys.exit(0 if success else 1)
