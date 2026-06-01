import os
import pickle
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request, send_from_directory
from sklearn.preprocessing import MinMaxScaler

app = Flask(__name__)

# Paths
MODEL_PATH = "file_DT(clas).sav"
DATA_PATH = "heart_disease_data.csv"

# Load Decision Tree model
if os.path.exists(MODEL_PATH):
    try:
        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)
        print("Model loaded successfully!")
    except Exception as e:
        print("Error loading model:", e)
        model = None
else:
    print(f"Model path {MODEL_PATH} not found!")
    model = None

# Load dataset and setup scaler
if os.path.exists(DATA_PATH):
    try:
        df_raw = pd.read_csv(DATA_PATH)
        X_raw = df_raw.drop(columns=['target'])
        y_raw = df_raw['target']
        
        # Fit scaler
        scaler = MinMaxScaler()
        scaler.fit(X_raw)
        print("Scaler fitted successfully on dataset.")
    except Exception as e:
        print("Error loading dataset:", e)
        df_raw = None
        X_raw = None
        scaler = None
else:
    print(f"Dataset path {DATA_PATH} not found!")
    df_raw = None
    X_raw = None
    scaler = None

# Feature metadata for frontend auto-generation
feature_metadata = [
    {"name": "age", "label": "Age", "type": "continuous", "min": 29, "max": 77, "default": 54},
    {"name": "sex", "label": "Sex", "type": "binary", "options": [{"value": 0, "label": "Female"}, {"value": 1, "label": "Male"}], "default": 1},
    {"name": "cp", "label": "Chest Pain Type", "type": "categorical", "options": [
        {"value": 0, "label": "Typical Angina (0)"},
        {"value": 1, "label": "Atypical Angina (1)"},
        {"value": 2, "label": "Non-anginal Pain (2)"},
        {"value": 3, "label": "Asymptomatic (3)"}
    ], "default": 1},
    {"name": "trestbps", "label": "Resting Blood Pressure (mm Hg)", "type": "continuous", "min": 94, "max": 200, "default": 130},
    {"name": "chol", "label": "Serum Cholesterol (mg/dl)", "type": "continuous", "min": 126, "max": 564, "default": 240},
    {"name": "fbs", "label": "Fasting Blood Sugar > 120 mg/dl", "type": "binary", "options": [{"value": 0, "label": "False (< 120 mg/dl)"}, {"value": 1, "label": "True (> 120 mg/dl)"}], "default": 0},
    {"name": "restecg", "label": "Resting ECG Results", "type": "categorical", "options": [
        {"value": 0, "label": "Normal (0)"},
        {"value": 1, "label": "ST-T Wave Abnormality (1)"},
        {"value": 2, "label": "Left Ventricular Hypertrophy (2)"}
    ], "default": 1},
    {"name": "thalach", "label": "Max Heart Rate Achieved", "type": "continuous", "min": 71, "max": 202, "default": 150},
    {"name": "exang", "label": "Exercise Induced Angina", "type": "binary", "options": [{"value": 0, "label": "No"}, {"value": 1, "label": "Yes"}], "default": 0},
    {"name": "oldpeak", "label": "ST Depression (Oldpeak)", "type": "continuous", "min": 0.0, "max": 6.2, "step": 0.1, "default": 1.0},
    {"name": "slope", "label": "Slope of Peak ST Segment", "type": "categorical", "options": [
        {"value": 0, "label": "Upsloping (0)"},
        {"value": 1, "label": "Flat (1)"},
        {"value": 2, "label": "Downsloping (2)"}
    ], "default": 1},
    {"name": "ca", "label": "Major Vessels Colored (CA)", "type": "categorical", "options": [
        {"value": 0, "label": "0 Vessels"},
        {"value": 1, "label": "1 Vessel"},
        {"value": 2, "label": "2 Vessels"},
        {"value": 3, "label": "3 Vessels"},
        {"value": 4, "label": "4 Vessels"}
    ], "default": 0},
    {"name": "thal", "label": "Thalassemia (Thal)", "type": "categorical", "options": [
        {"value": 0, "label": "Null/Unknown (0)"},
        {"value": 1, "label": "Normal (1)"},
        {"value": 2, "label": "Fixed Defect (2)"},
        {"value": 3, "label": "Reversible Defect (3)"}
    ], "default": 2}
]

def serialize_tree(tree, feature_names, node_id=0):
    """Recursively serializes a decision tree into JSON."""
    left_child = tree.children_left[node_id]
    right_child = tree.children_right[node_id]
    
    value = tree.value[node_id][0].tolist()
    samples = int(tree.n_node_samples[node_id])
    
    if left_child == -1:  # Leaf node
        prediction = int(np.argmax(value))
        return {
            "id": int(node_id),
            "samples": samples,
            "value": value,
            "prediction": prediction,
            "is_leaf": True
        }
    else:  # Decision node
        feat_idx = int(tree.feature[node_id])
        feat_name = feature_names[feat_idx]
        threshold = float(tree.threshold[node_id])
        return {
            "id": int(node_id),
            "feature_index": feat_idx,
            "feature_name": feat_name,
            "threshold": threshold,
            "samples": samples,
            "value": value,
            "is_leaf": False,
            "left": serialize_tree(tree, feature_names, left_child),
            "right": serialize_tree(tree, feature_names, right_child)
        }

@app.route("/")
def serve_index():
    return send_from_directory(".", "index.html")

@app.route("/style.css")
def serve_css():
    return send_from_directory(".", "style.css")

@app.route("/app.js")
def serve_js():
    return send_from_directory(".", "app.js")

@app.route("/api/features")
def get_features():
    return jsonify(feature_metadata)

@app.route("/api/tree-data")
def get_tree_data():
    if model is None:
        return jsonify({"error": "Model not loaded"}), 500
    
    feature_names = [f["name"] for f in feature_metadata]
    tree_struct = serialize_tree(model.tree_, feature_names)
    return jsonify(tree_struct)

@app.route("/api/samples")
def get_samples():
    if df_raw is None:
        return jsonify({"error": "Dataset not loaded"}), 500
    
    # Return 15 random samples
    samples = df_raw.sample(min(15, len(df_raw))).to_dict(orient="records")
    return jsonify(samples)

@app.route("/api/predict", methods=["POST"])
def predict():
    if model is None or scaler is None:
        return jsonify({"error": "Model or Scaler not loaded"}), 500
    
    try:
        data = request.json
        # Convert dictionary to ordered list
        feature_names = [f["name"] for f in feature_metadata]
        raw_values = []
        for name in feature_names:
            if name not in data:
                return jsonify({"error": f"Missing feature: {name}"}), 400
            raw_values.append(float(data[name]))
        
        # Scale values using fitted MinMaxScaler
        X_raw_input = np.array([raw_values])
        X_scaled = scaler.transform(X_raw_input)
        
        # Run prediction
        prediction = int(model.predict(X_scaled)[0])
        probabilities = model.predict_proba(X_scaled)[0].tolist()
        
        # Get decision path node IDs
        indicator = model.decision_path(X_scaled)
        decision_path = indicator.indices.tolist()
        
        return jsonify({
            "prediction": prediction,
            "probabilities": probabilities,
            "decision_path": decision_path
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
