import argparse
import json
import time
from pathlib import Path

import joblib
import pandas as pd
import requests

ROOT = Path(__file__).resolve().parent


def parse_args():
    parser = argparse.ArgumentParser(description="Create embeddings for course JSON subtitle chunks.")
    parser.add_argument(
        "--json-dir",
        default=str(ROOT / "jsons"),
        help="Folder containing the subtitle JSON files.",
    )
    parser.add_argument(
        "--output",
        default=str(ROOT / "embeddings.joblib"),
        help="Path where the embeddings joblib file will be saved.",
    )
    return parser.parse_args()


def create_embedding(text_list, batch_size=64, retries=4):
    # https://github.com/ollama/ollama/blob/main/docs/api.md#generate-embeddings
    embeddings = []
    for start in range(0, len(text_list), batch_size):
        batch = text_list[start : start + batch_size]
        last_error = None
        for attempt in range(retries):
            response = requests.post(
                "http://localhost:11434/api/embed",
                json={"model": "bge-m3", "input": batch},
                timeout=180,
            )
            if response.ok:
                payload = response.json()
                if "embeddings" not in payload:
                    raise ValueError(f"Unexpected Ollama embed response: {payload}")
                embeddings.extend(payload["embeddings"])
                last_error = None
                break
            last_error = response
            time.sleep(2 * (attempt + 1))
        if last_error is not None:
            raise RuntimeError(
                f"Ollama embed failed ({last_error.status_code}): {last_error.text[:500]}"
            )
    return embeddings


def main():
    args = parse_args()
    json_dir = Path(args.json_dir).expanduser().resolve()
    output_path = Path(args.output).expanduser().resolve()

    if not json_dir.exists():
        raise FileNotFoundError(f"JSON folder not found: {json_dir}")

    my_dicts = []
    chunk_id = 0

    for json_file in sorted(json_dir.iterdir()):
        if json_file.suffix.lower() != ".json":
            continue

        with json_file.open("r", encoding="utf-8") as f:
            content = json.load(f)

        print(f"Creating Embeddings for {json_file.name}", flush=True)
        embeddings = create_embedding([c["text"] for c in content["chunks"]])

        for i, chunk in enumerate(content["chunks"]):
            chunk["chunk_id"] = chunk_id
            chunk["embedding"] = embeddings[i]
            chunk_id += 1
            my_dicts.append(chunk)

    df = pd.DataFrame.from_records(my_dicts)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(df, output_path)
    print(f"Saved {len(df)} chunks to {output_path}", flush=True)


if __name__ == "__main__":
    main()

