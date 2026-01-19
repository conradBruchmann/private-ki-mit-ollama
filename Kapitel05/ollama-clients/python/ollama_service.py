"""
OllamaService - Vollständiger Service für Ollama-Integration

Beispiel aus Kapitel 5: API-Zugriff und Integration
"""

import ollama
from dataclasses import dataclass, field
from typing import Generator, Optional


@dataclass
class Message:
    """Chat-Nachricht mit Rolle und Inhalt."""
    role: str
    content: str


@dataclass
class ChatOptions:
    """Optionen für die Chat-Generierung."""
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    top_k: Optional[int] = None
    num_predict: Optional[int] = None
    num_ctx: Optional[int] = None
    repeat_penalty: Optional[float] = None
    seed: Optional[int] = None
    stop: Optional[list[str]] = None


class OllamaService:
    """
    Wrapper-Klasse für Ollama-Interaktionen.

    Verwaltet Chat-History und bietet einfache Methoden für
    Chat, Streaming und Embeddings.
    """

    def __init__(self, model: str = "llama3.2"):
        self.model = model
        self.history: list[Message] = []

    def chat(self, user_message: str, options: Optional[ChatOptions] = None) -> str:
        """
        Einfacher Chat ohne Streaming.

        Args:
            user_message: Die Nachricht des Benutzers
            options: Optionale Generierungsparameter

        Returns:
            Die Antwort des Assistenten
        """
        self.history.append(Message(role="user", content=user_message))

        opts = {}
        if options:
            if options.temperature is not None:
                opts["temperature"] = options.temperature
            if options.top_p is not None:
                opts["top_p"] = options.top_p
            if options.top_k is not None:
                opts["top_k"] = options.top_k
            if options.num_predict is not None:
                opts["num_predict"] = options.num_predict
            if options.num_ctx is not None:
                opts["num_ctx"] = options.num_ctx
            if options.repeat_penalty is not None:
                opts["repeat_penalty"] = options.repeat_penalty
            if options.seed is not None:
                opts["seed"] = options.seed
            if options.stop is not None:
                opts["stop"] = options.stop

        response = ollama.chat(
            model=self.model,
            messages=[{"role": m.role, "content": m.content} for m in self.history],
            options=opts if opts else None
        )

        assistant_message = response["message"]["content"]
        self.history.append(Message(role="assistant", content=assistant_message))

        return assistant_message

    def stream_chat(
        self,
        user_message: str,
        options: Optional[ChatOptions] = None
    ) -> Generator[str, None, None]:
        """
        Chat mit Streaming - gibt Token für Token zurück.

        Args:
            user_message: Die Nachricht des Benutzers
            options: Optionale Generierungsparameter

        Yields:
            Einzelne Tokens der Antwort
        """
        self.history.append(Message(role="user", content=user_message))

        opts = {}
        if options:
            if options.temperature is not None:
                opts["temperature"] = options.temperature
            if options.num_predict is not None:
                opts["num_predict"] = options.num_predict

        stream = ollama.chat(
            model=self.model,
            messages=[{"role": m.role, "content": m.content} for m in self.history],
            stream=True,
            options=opts if opts else None
        )

        full_response = ""
        for chunk in stream:
            content = chunk["message"]["content"]
            full_response += content
            yield content

        self.history.append(Message(role="assistant", content=full_response))

    def set_system_prompt(self, prompt: str) -> None:
        """System-Prompt setzen (löscht bisherige History)."""
        self.history = [Message(role="system", content=prompt)]

    def clear_history(self) -> None:
        """History löschen (behält System-Prompt)."""
        system = next((m for m in self.history if m.role == "system"), None)
        self.history = [system] if system else []

    def embed(self, text: str, model: str = "nomic-embed-text") -> list[float]:
        """
        Embedding für einen Text generieren.

        Args:
            text: Der zu embeddende Text
            model: Das Embedding-Modell

        Returns:
            Der Embedding-Vektor
        """
        response = ollama.embed(model=model, input=text)
        return response["embeddings"][0]

    def embed_batch(
        self,
        texts: list[str],
        model: str = "nomic-embed-text"
    ) -> list[list[float]]:
        """
        Embeddings für mehrere Texte generieren.

        Args:
            texts: Liste der zu embeddenden Texte
            model: Das Embedding-Modell

        Returns:
            Liste der Embedding-Vektoren
        """
        response = ollama.embed(model=model, input=texts)
        return response["embeddings"]

    def complete(self, prompt: str, options: Optional[ChatOptions] = None) -> str:
        """
        Text-Completion (nicht Chat).

        Args:
            prompt: Der Prompt für die Completion
            options: Optionale Generierungsparameter

        Returns:
            Die generierte Completion
        """
        opts = {}
        if options:
            if options.temperature is not None:
                opts["temperature"] = options.temperature
            if options.num_predict is not None:
                opts["num_predict"] = options.num_predict

        response = ollama.generate(
            model=self.model,
            prompt=prompt,
            stream=False,
            options=opts if opts else None
        )

        return response["response"]

    def set_model(self, model: str) -> None:
        """Aktuelles Modell wechseln."""
        self.model = model

    def get_history(self) -> list[Message]:
        """Aktuelle History abrufen."""
        return self.history.copy()

    @staticmethod
    def is_healthy() -> bool:
        """Prüfen ob Ollama erreichbar ist."""
        try:
            ollama.list()
            return True
        except Exception:
            return False

    @staticmethod
    def list_models() -> list[str]:
        """Verfügbare Modelle auflisten."""
        response = ollama.list()
        return [m["name"] for m in response["models"]]


class OllamaError(Exception):
    """Fehlerklasse für Ollama-spezifische Fehler."""

    def __init__(self, message: str, code: str, retryable: bool):
        super().__init__(message)
        self.code = code
        self.retryable = retryable


def safe_chat_with_retry(
    service: OllamaService,
    message: str,
    max_retries: int = 3
) -> str:
    """
    Chat mit Retry-Logik.

    Args:
        service: Die OllamaService-Instanz
        message: Die Nachricht
        max_retries: Maximale Anzahl Versuche

    Returns:
        Die Antwort des Assistenten

    Raises:
        OllamaError: Bei nicht-wiederholbaren Fehlern
    """
    import time

    last_error = None

    for attempt in range(1, max_retries + 1):
        try:
            return service.chat(message)
        except Exception as e:
            last_error = e
            error_msg = str(e).lower()

            # Nicht-wiederholbare Fehler
            if "not found" in error_msg:
                raise OllamaError(
                    f"Model not found. Run: ollama pull {service.model}",
                    "MODEL_NOT_FOUND",
                    False
                )

            # Wiederholbare Fehler
            if "connection" in error_msg or "timeout" in error_msg:
                print(f"Attempt {attempt}/{max_retries} failed, retrying...")
                time.sleep(1 * attempt)  # Exponential backoff
                continue

            raise OllamaError(str(e), "UNKNOWN", False)

    raise OllamaError(
        f"Failed after {max_retries} attempts: {last_error}",
        "MAX_RETRIES_EXCEEDED",
        False
    )
