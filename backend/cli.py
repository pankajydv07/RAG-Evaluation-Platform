"""Command Line Interface for RAG Evaluation Platform."""

import asyncio
import io
import sys
import os
import typer
import uvicorn
from rich.console import Console
from rich.table import Table
from backend.core.config import get_settings
from backend.core.database import get_session_factory, init_db
from backend.eval.gate import run_evaluation_gate
from backend.providers.factory import get_embedding_provider, get_llm_provider
from backend.retrieval.loader import DocumentLoader
from backend.schemas.ab_test import ABTestRequest
from backend.services.ab_service import ABTestingService
from backend.services.eval_service import EvalService
from backend.services.ingestion_service import IngestionService
from backend.services.rag_service import RAGService

# Ensure UTF-8 safe output on Windows by setting stdout/stderr encoding
os.environ.setdefault("PYTHONUTF8", "1")

cli_app = typer.Typer(help="RAG Platform CLI")
console = Console(highlight=False)


@cli_app.command()
def serve(
    host: str = "0.0.0.0",
    port: int = 8000,
    reload: bool = True,
):
    """Start the FastAPI backend server."""
    console.print(f"[bold green]Starting RAG Platform Server on {host}:{port}...[/bold green]")
    uvicorn.run("backend.main:app", host=host, port=port, reload=reload)


@cli_app.command()
def ingest(
    collection: str = typer.Option(..., "--collection", "-c", help="Collection name"),
    file_path: str = typer.Option(..., "--file", "-f", help="Path to text or PDF file"),
    strategy: str = typer.Option("sentence", "--strategy", "-s", help="sentence or hierarchical"),
):
    """Ingest a local document into the vector database."""
    async def _run():
        await init_db()
        session_factory = get_session_factory()
        async with session_factory() as session:
            embedding_provider = get_embedding_provider()
            service = IngestionService(session, embedding_provider)

            if file_path.lower().endswith(".pdf"):
                loaded = DocumentLoader.load_pdf(file_path)
            else:
                with open(file_path, "r", encoding="utf-8") as f:
                    loaded = DocumentLoader.load_text(f.read(), source_uri=file_path)

            console.print(f"[yellow]Ingesting '{file_path}' into collection '{collection}'...[/yellow]")
            summary = await service.ingest_document(
                collection_name=collection,
                loaded_doc=loaded,
                chunking_strategy=strategy,  # type: ignore
            )
            await session.commit()
            console.print(f"[bold green]Successfully indexed {summary.chunks_created} chunks into collection '{collection}'![/bold green]")

    asyncio.run(_run())


@cli_app.command()
def query(
    collection: str = typer.Option(..., "--collection", "-c", help="Collection name"),
    question: str = typer.Option(..., "--query", "-q", help="Natural language question"),
    top_k: int = typer.Option(5, "--top-k", "-k", help="Number of passages to retrieve"),
    multi_query: bool = typer.Option(False, "--multi-query", help="Enable Multi-Query RAG-Fusion (generate query variations)"),
    no_reorder: bool = typer.Option(False, "--no-reorder", help="Disable Lost-in-the-Middle context reordering"),
):
    """Query the RAG system and generate a grounded answer."""
    async def _run():
        await init_db()
        session_factory = get_session_factory()
        async with session_factory() as session:
            embedding_provider = get_embedding_provider()
            llm_provider = get_llm_provider(role="generator")
            service = RAGService(session, embedding_provider, llm_provider)

            console.print(f"[cyan]Searching '{collection}' for: '{question}'...[/cyan]")
            if multi_query:
                console.print("[yellow]Multi-Query RAG-Fusion enabled — generating query variations...[/yellow]")
            response = await service.answer_query(
                collection_name=collection,
                query_text=question,
                top_k=top_k,
                enable_multi_query=multi_query,
                enable_lost_in_middle_reorder=not no_reorder,
            )
            await session.commit()

            console.print("\n[bold green]Answer:[/bold green]")
            console.print(response.answer)

            table = Table(title="Retrieved Passages & Citations")
            table.add_column("#", style="dim", width=4)
            table.add_column("Similarity", justify="right", width=12)
            table.add_column("Snippet")

            for i, chunk in enumerate(response.citations, 1):
                table.add_row(
                    f"[{i}]",
                    f"{chunk.similarity_score:.4f}",
                    chunk.text[:120] + ("..." if len(chunk.text) > 120 else ""),
                )
            console.print(table)
            console.print(f"\n[dim]Model: {response.model} | Latency: {response.latency_ms:.1f}ms[/dim]")

    asyncio.run(_run())


@cli_app.command()
def ab_test(
    collection: str = typer.Option("system-design", "--collection", "-c", help="Collection name"),
    question: str = typer.Option(..., "--query", "-q", help="Question to evaluate"),
    provider_a: str = typer.Option("groq", "--provider-a", help="Model A provider (groq|nebius)"),
    model_a: str = typer.Option("openai/gpt-oss-120b", "--model-a", help="Model A ID"),
    provider_b: str = typer.Option("nebius", "--provider-b", help="Model B provider (groq|nebius)"),
    model_b: str = typer.Option("meta-llama/Llama-3.3-70B-Instruct", "--model-b", help="Model B ID"),
):
    """Run head-to-head model A/B comparison on the same retrieved context."""
    async def _run():
        await init_db()
        session_factory = get_session_factory()
        async with session_factory() as session:
            embedding_provider = get_embedding_provider()
            service = ABTestingService(session, embedding_provider)

            console.print(f"[cyan]Running A/B Test on '{collection}' for: '{question}'...[/cyan]")
            req = ABTestRequest(
                collection_name=collection,
                query=question,
                provider_a=provider_a,  # type: ignore
                model_a=model_a,
                provider_b=provider_b,  # type: ignore
                model_b=model_b,
                judge_provider="groq",
                judge_model="qwen/qwen3.6-27b",
            )
            res = await service.run_ab_test(req)

            console.print("\n[bold cyan]=== Model A Output ===[/bold cyan]")
            console.print(f"[dim]{res.model_a_result.model} ({res.model_a_result.latency_ms:.1f}ms)[/dim]")
            console.print(res.model_a_result.answer)

            console.print("\n[bold cyan]=== Model B Output ===[/bold cyan]")
            console.print(f"[dim]{res.model_b_result.model} ({res.model_b_result.latency_ms:.1f}ms)[/dim]")
            console.print(res.model_b_result.answer)

            console.print("\n[bold yellow]=== Judge Verdict ===[/bold yellow]")
            winner_text = "Tie" if res.judge_evaluation.winner == "tie" else f"Model {res.judge_evaluation.winner} Wins"
            console.print(f"[bold green]Winner:[/bold green] {winner_text}")
            console.print(f"[bold green]Scores:[/bold green] Model A: {res.judge_evaluation.model_a_score:.2f} | Model B: {res.judge_evaluation.model_b_score:.2f}")
            console.print(f"[bold green]Critique:[/bold green] {res.judge_evaluation.critique}")

    asyncio.run(_run())


@cli_app.command()
def eval_gate(
    dataset: str = typer.Option("ragapp/eval/golden_dataset.json", "--dataset", "-d", help="Golden dataset JSON path"),
    thresholds: str = typer.Option("eval/thresholds.yml", "--thresholds", "-t", help="Thresholds YAML path"),
):
    """Run automated CI/CD quality regression evaluation gate."""
    async def _run():
        await init_db()
        return await run_evaluation_gate(dataset_path=dataset, thresholds_path=thresholds)

    success = asyncio.run(_run())
    if not success:
        raise typer.Exit(code=1)


@cli_app.command()
def eval_summary():
    """Display overall evaluation metrics and quality scores."""
    async def _run():
        await init_db()
        session_factory = get_session_factory()
        async with session_factory() as session:
            judge_provider = get_llm_provider(role="judge")
            service = EvalService(session, judge_provider)
            stats = await service.get_metrics_summary()

            table = Table(title="RAG Evaluation & Quality Metrics")
            table.add_column("Metric", style="bold cyan")
            table.add_column("Score / Value", style="bold green")

            table.add_row("Total Traces", str(stats.total_traces))
            table.add_row("Evaluated Traces", str(stats.evaluated_traces))
            table.add_row("Faithfulness (Mean)", f"{stats.mean_faithfulness:.3f}")
            table.add_row("Answer Relevance (Mean)", f"{stats.mean_answer_relevance:.3f}")
            table.add_row("Context Precision (Mean)", f"{stats.mean_context_precision:.3f}")
            table.add_row("Avg Query Latency", f"{stats.avg_query_latency_ms:.1f} ms")

            console.print(table)

    asyncio.run(_run())


if __name__ == "__main__":
    cli_app()
