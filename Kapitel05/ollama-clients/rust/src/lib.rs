//! Ollama Rust Client Library
//!
//! Beispiel aus Kapitel 5: API-Zugriff und Integration
//!
//! Diese Bibliothek bietet einen einfachen Rust-Client für die Ollama API.

use anyhow::Result;
use futures::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};

/// Standard Ollama URL
pub const OLLAMA_URL: &str = "http://localhost:11434";

/// Chat-Nachricht mit Rolle und Inhalt
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
}

impl Message {
    pub fn user(content: impl Into<String>) -> Self {
        Self {
            role: "user".to_string(),
            content: content.into(),
        }
    }

    pub fn assistant(content: impl Into<String>) -> Self {
        Self {
            role: "assistant".to_string(),
            content: content.into(),
        }
    }

    pub fn system(content: impl Into<String>) -> Self {
        Self {
            role: "system".to_string(),
            content: content.into(),
        }
    }
}

/// Request für Chat-API
#[derive(Debug, Serialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<Message>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<ChatOptions>,
}

/// Optionen für die Generierung
#[derive(Debug, Default, Serialize)]
pub struct ChatOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_k: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub num_predict: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,
}

/// Response von Chat-API
#[derive(Debug, Deserialize)]
pub struct ChatResponse {
    pub model: String,
    pub message: Message,
    pub done: bool,
    #[serde(default)]
    pub total_duration: Option<u64>,
    #[serde(default)]
    pub eval_count: Option<u32>,
}

/// Request für Generate-API
#[derive(Debug, Serialize)]
pub struct GenerateRequest {
    pub model: String,
    pub prompt: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<ChatOptions>,
}

/// Response von Generate-API
#[derive(Debug, Deserialize)]
pub struct GenerateResponse {
    pub model: String,
    pub response: String,
    pub done: bool,
}

/// Request für Embeddings-API
#[derive(Debug, Serialize)]
pub struct EmbedRequest {
    pub model: String,
    pub input: Vec<String>,
}

/// Response von Embeddings-API
#[derive(Debug, Deserialize)]
pub struct EmbedResponse {
    pub embeddings: Vec<Vec<f32>>,
}

/// Ollama Client
pub struct OllamaClient {
    client: Client,
    base_url: String,
    pub model: String,
    history: Vec<Message>,
}

impl OllamaClient {
    /// Neuen Client erstellen
    pub fn new(model: impl Into<String>) -> Self {
        Self {
            client: Client::new(),
            base_url: OLLAMA_URL.to_string(),
            model: model.into(),
            history: Vec::new(),
        }
    }

    /// Client mit benutzerdefinierter URL
    pub fn with_url(model: impl Into<String>, url: impl Into<String>) -> Self {
        Self {
            client: Client::new(),
            base_url: url.into(),
            model: model.into(),
            history: Vec::new(),
        }
    }

    /// System-Prompt setzen
    pub fn set_system_prompt(&mut self, prompt: impl Into<String>) {
        self.history = vec![Message::system(prompt)];
    }

    /// History löschen
    pub fn clear_history(&mut self) {
        let system = self.history.iter().find(|m| m.role == "system").cloned();
        self.history = system.map(|s| vec![s]).unwrap_or_default();
    }

    /// Einfacher Chat ohne Streaming
    pub async fn chat(&mut self, user_message: impl Into<String>) -> Result<String> {
        let user_msg = Message::user(user_message);
        self.history.push(user_msg);

        let request = ChatRequest {
            model: self.model.clone(),
            messages: self.history.clone(),
            stream: Some(false),
            options: None,
        };

        let response: ChatResponse = self
            .client
            .post(format!("{}/api/chat", self.base_url))
            .json(&request)
            .send()
            .await?
            .json()
            .await?;

        let content = response.message.content.clone();
        self.history.push(response.message);

        Ok(content)
    }

    /// Chat mit Optionen
    pub async fn chat_with_options(
        &mut self,
        user_message: impl Into<String>,
        options: ChatOptions,
    ) -> Result<String> {
        let user_msg = Message::user(user_message);
        self.history.push(user_msg);

        let request = ChatRequest {
            model: self.model.clone(),
            messages: self.history.clone(),
            stream: Some(false),
            options: Some(options),
        };

        let response: ChatResponse = self
            .client
            .post(format!("{}/api/chat", self.base_url))
            .json(&request)
            .send()
            .await?
            .json()
            .await?;

        let content = response.message.content.clone();
        self.history.push(response.message);

        Ok(content)
    }

    /// Chat ohne History (einzelne Anfrage)
    pub async fn chat_once(&self, messages: Vec<Message>) -> Result<String> {
        let request = ChatRequest {
            model: self.model.clone(),
            messages,
            stream: Some(false),
            options: None,
        };

        let response: ChatResponse = self
            .client
            .post(format!("{}/api/chat", self.base_url))
            .json(&request)
            .send()
            .await?
            .json()
            .await?;

        Ok(response.message.content)
    }

    /// Chat mit Streaming
    pub async fn stream_chat(
        &mut self,
        user_message: impl Into<String>,
    ) -> Result<impl futures::Stream<Item = Result<String>>> {
        let user_msg = Message::user(user_message);
        self.history.push(user_msg);

        let request = ChatRequest {
            model: self.model.clone(),
            messages: self.history.clone(),
            stream: Some(true),
            options: None,
        };

        let response = self
            .client
            .post(format!("{}/api/chat", self.base_url))
            .json(&request)
            .send()
            .await?;

        let stream = response.bytes_stream().map(|result| {
            result.map_err(anyhow::Error::from).and_then(|bytes| {
                let text = String::from_utf8_lossy(&bytes);
                let mut content = String::new();

                for line in text.lines() {
                    if let Ok(data) = serde_json::from_str::<ChatResponse>(line) {
                        content.push_str(&data.message.content);
                    }
                }

                Ok(content)
            })
        });

        Ok(stream)
    }

    /// Text-Completion
    pub async fn complete(&self, prompt: impl Into<String>) -> Result<String> {
        let request = GenerateRequest {
            model: self.model.clone(),
            prompt: prompt.into(),
            stream: Some(false),
            options: None,
        };

        let response: GenerateResponse = self
            .client
            .post(format!("{}/api/generate", self.base_url))
            .json(&request)
            .send()
            .await?
            .json()
            .await?;

        Ok(response.response)
    }

    /// Embeddings generieren
    pub async fn embed(&self, text: impl Into<String>) -> Result<Vec<f32>> {
        self.embed_with_model(text, "nomic-embed-text").await
    }

    /// Embeddings mit spezifischem Modell
    pub async fn embed_with_model(
        &self,
        text: impl Into<String>,
        model: &str,
    ) -> Result<Vec<f32>> {
        let request = EmbedRequest {
            model: model.to_string(),
            input: vec![text.into()],
        };

        let response: EmbedResponse = self
            .client
            .post(format!("{}/api/embed", self.base_url))
            .json(&request)
            .send()
            .await?
            .json()
            .await?;

        Ok(response.embeddings.into_iter().next().unwrap_or_default())
    }

    /// Batch-Embeddings
    pub async fn embed_batch(&self, texts: Vec<String>) -> Result<Vec<Vec<f32>>> {
        self.embed_batch_with_model(texts, "nomic-embed-text").await
    }

    /// Batch-Embeddings mit spezifischem Modell
    pub async fn embed_batch_with_model(
        &self,
        texts: Vec<String>,
        model: &str,
    ) -> Result<Vec<Vec<f32>>> {
        let request = EmbedRequest {
            model: model.to_string(),
            input: texts,
        };

        let response: EmbedResponse = self
            .client
            .post(format!("{}/api/embed", self.base_url))
            .json(&request)
            .send()
            .await?
            .json()
            .await?;

        Ok(response.embeddings)
    }

    /// Prüfen ob Ollama erreichbar ist
    pub async fn is_healthy(&self) -> bool {
        self.client
            .get(format!("{}/api/tags", self.base_url))
            .send()
            .await
            .map(|r| r.status().is_success())
            .unwrap_or(false)
    }

    /// Aktuelle History abrufen
    pub fn get_history(&self) -> &[Message] {
        &self.history
    }
}

/// Kosinus-Ähnlichkeit berechnen
pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();

    if norm_a == 0.0 || norm_b == 0.0 {
        0.0
    } else {
        dot / (norm_a * norm_b)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_message_creation() {
        let user = Message::user("Hello");
        assert_eq!(user.role, "user");
        assert_eq!(user.content, "Hello");

        let assistant = Message::assistant("Hi there");
        assert_eq!(assistant.role, "assistant");

        let system = Message::system("You are helpful");
        assert_eq!(system.role, "system");
    }

    #[test]
    fn test_cosine_similarity() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![1.0, 0.0, 0.0];
        assert!((cosine_similarity(&a, &b) - 1.0).abs() < 0.001);

        let c = vec![0.0, 1.0, 0.0];
        assert!((cosine_similarity(&a, &c) - 0.0).abs() < 0.001);
    }
}
