"""
MLflow Setup for Giftkart AI Model Lifecycle Management
This script sets up MLflow for tracking AI experiments and models
"""

import os
import mlflow
from mlflow.tracking import MlflowClient

# MLflow configuration
MLFLOW_TRACKING_URI = os.getenv('MLFLOW_TRACKING_URI', 'http://localhost:5000')
MLFLOW_EXPERIMENT_NAME = 'giftkart-ai-models'

# Initialize MLflow
def initialize_mlflow():
    """Initialize MLflow tracking server"""
    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
    print(f"MLflow tracking URI: {MLFLOW_TRACKING_URI}")
    
    # Create or get experiment
    experiment = mlflow.get_experiment_by_name(MLFLOW_EXPERIMENT_NAME)
    if experiment is None:
        experiment_id = mlflow.create_experiment(MLFLOW_EXPERIMENT_NAME)
        print(f"Created new experiment: {MLFLOW_EXPERIMENT_NAME} (ID: {experiment_id})")
    else:
        print(f"Using existing experiment: {MLFLOW_EXPERIMENT_NAME} (ID: {experiment.experiment_id})")
    
    mlflow.set_experiment(MLFLOW_EXPERIMENT_NAME)
    return experiment.experiment_id if experiment else mlflow.create_experiment(MLFLOW_EXPERIMENT_NAME)

# Log model training
def log_model_training(model_name, model, metrics, params, artifacts=None):
    """Log model training metrics and parameters"""
    with mlflow.start_run(run_name=model_name):
        # Log parameters
        mlflow.log_params(params)
        
        # Log metrics
        mlflow.log_metrics(metrics)
        
        # Log model
        mlflow.sklearn.log_model(model, model_name)
        
        # Log artifacts if provided
        if artifacts:
            for artifact_name, artifact_path in artifacts.items():
                mlflow.log_artifact(artifact_path, artifact_name)
        
        run_id = mlflow.active_run().info.run_id
        print(f"Logged model training: {model_name} (Run ID: {run_id})")
        return run_id

# Load model from MLflow
def load_model(model_name, run_id=None):
    """Load a model from MLflow"""
    if run_id:
        model_uri = f"runs:/{run_id}/{model_name}"
    else:
        model_uri = f"models:/{model_name}/latest"
    
    model = mlflow.sklearn.load_model(model_uri)
    print(f"Loaded model: {model_name} from {model_uri}")
    return model

# Register model
def register_model(model_name, run_id, stage="Staging"):
    """Register a model in MLflow Model Registry"""
    model_uri = f"runs:/{run_id}/{model_name}"
    
    # Register model
    model_version = mlflow.register_model(
        model_uri=model_uri,
        name=model_name
    )
    
    # Transition to specified stage
    client = MlflowClient()
    client.transition_model_version_stage(
        name=model_name,
        version=model_version.version,
        stage=stage
    )
    
    print(f"Registered model: {model_name} v{model_version.version} in {stage} stage")
    return model_version.version

# Get model metrics
def get_model_metrics(run_id):
    """Get metrics for a specific run"""
    client = MlflowClient()
    run = client.get_run(run_id)
    return run.data.metrics

# Compare models
def compare_models(model_name, top_n=5):
    """Compare different versions of a model"""
    client = MlflowClient()
    
    # Get all runs for the model
    filter_string = f"params.model_name = '{model_name}'"
    runs = client.search_runs(
        experiment_ids=[mlflow.get_experiment_by_name(MLFLOW_EXPERIMENT_NAME).experiment_id],
        filter_string=filter_string,
        order_by=["metrics.accuracy DESC"],
        max_results=top_n
    )
    
    print(f"\nTop {top_n} runs for {model_name}:")
    for run in runs:
        print(f"Run ID: {run.info.run_id}")
        print(f"Accuracy: {run.data.metrics.get('accuracy', 'N/A')}")
        print(f"Parameters: {run.data.params}")
        print("-" * 50)
    
    return runs

if __name__ == "__main__":
    # Initialize MLflow
    experiment_id = initialize_mlflow()
    print(f"\nMLflow initialized successfully!")
    print(f"Experiment ID: {experiment_id}")
    print(f"Tracking UI: {MLFLOW_TRACKING_URI}")
