import joblib
import os
from sklearn.ensemble import IsolationForest
from ml.generate_normal_traffic import generate_normal_traffic

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "isolation_forest.joblib")

def train_model():
    df = generate_normal_traffic(n_samples=1000)

    model = IsolationForest(
        n_estimators=100,
        contamination=0.05,
        random_state=42
    )
    model.fit(df)

    joblib.dump(model, MODEL_PATH)
    print(f"Model trained and saved to {MODEL_PATH}")

if __name__ == "__main__":
    train_model()