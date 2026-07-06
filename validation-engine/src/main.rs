use axum::{
    routing::post,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tower_http::cors::{Any, CorsLayer};
use http::Method;

#[derive(Deserialize)]
struct ValidationRequest {
    equation: String,
    variables: Vec<String>,
}

#[derive(Serialize)]
struct ValidationResponse {
    proof_hash: String,
}

async fn generate_proof(Json(payload): Json<ValidationRequest>) -> Json<ValidationResponse> {
    let raw_data = format!("MATH:{}|VARS:{:?}", payload.equation, payload.variables);
    
    let mut hasher = Sha256::new();
    hasher.update(raw_data.as_bytes());
    let result = hasher.finalize();
    
    let proof_hash = format!("{:x}", result);
    println!("Generated new proof hash: {}", proof_hash);
    
    Json(ValidationResponse { proof_hash })
}

#[tokio::main]
async fn main() {
    // SECURITY FIX: Allow the React frontend to talk to this Rust backend
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::POST])
        .allow_headers(Any);

    let app = Router::new()
        .route("/validate", post(generate_proof))
        .layer(cors);
    
    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000").await.unwrap();
    println!("Rust Validation Engine running on http://127.0.0.1:3000");
    
    axum::serve(listener, app).await.unwrap();
}