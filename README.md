[README.md](https://github.com/user-attachments/files/28449876/README.md)
# heart_diseases_AI_predictor# Heart Disease Decision Tree Node UI

An interactive, premium web application dashboard that serves as a visual diagnostic simulator and real-time path explorer for a trained Decision Tree Classifier. 

The application utilizes a Python Flask backend to run model inference and standard MinMax feature scaling, paired with an interactive frontend powered by D3.js that visualizes the nodes of the decision tree and animates the exact decision path traversed for any set of inputs.

---

## 🌟 Key Features

- **Interactive SVG Node Graph**: Visualizes the decision tree layout. Zoom and pan around the structure, hover over nodes to inspect metrics, splits, sample sizes, and class distributions.
- **Real-Time Path Highlighting**: As soon as a patient prediction is run, the exact path through the decision tree's conditions to the final Leaf node glows in a neon dashed flow animation.
- **Dynamic Parameter Controls**: Continuous features render as sliders, binary parameters as toggle switches, and categorical variables as dropdowns.
- **Dataset Quick Loaders**: Load random sample rows from the raw patient dataset to instantly populate inputs and see how the tree classifies them.
- **Chronological Decision Logs**: A detailed step-by-step diagnostic breakdown of the split logic evaluated for the patient.

---

## 📁 Repository Structure

Below are the most important files you should upload to your GitHub repository:

```text
├── file_DT(clas).sav         # Trained Scikit-Learn Decision Tree model
├── heart_disease_data.csv    # Raw dataset (used for scaling limits and sample loading)
├── app.py                    # Python Flask backend server and API endpoints
├── index.html                # Frontend web layout
├── style.css                 # Premium dark-theme glassmorphism stylesheet
├── app.js                    # Frontend logic, API requests, and D3.js visualization
├── run_app.bat               # Double-clickable Windows launcher script
└── README.md                 # Project documentation (this file)
```

---

## 🛠️ Installation & Setup

### Prerequisites
Make sure you have **Python 3.8+** installed.

### Quick Start (Windows)
If you are on Windows, simply double-click the **`run_app.bat`** file in the project directory. The launcher will:
1. Verify and install required python modules.
2. Launch your default browser automatically to `http://127.0.0.1:5000/`.
3. Start the local Flask web server.

### Manual Setup (Any OS)
1. Install Python packages:
   ```bash
   pip install flask pandas scikit-learn
   ```
2. Navigate to the project directory and run the Flask app:
   ```bash
   python app.py
   ```
3. Open your browser and go to:
   ```text
   http://127.0.0.1:5000/
   ```

---

## 🧬 How It Works

1. **MinMax Scaling**: The model is trained on pre-scaled inputs. The Flask backend loads `heart_disease_data.csv` at startup, extracts minimum and maximum limits for the 13 feature columns, and automatically scales form inputs to `[0, 1]` before running predictions.
2. **Decision Paths**: When a prediction is made, Flask extracts the sparse `decision_path` from Scikit-Learn, returning the sequence of traversed node IDs.
3. **SVG Flow**: D3.js parses the tree JSON from `/api/tree-data`, positions the nodes, and translates the traversed ID path into glowing line animations on the SVG canvas.

---

## 💻 Technologies Used

- **Backend**: Python, Flask, Pandas, Scikit-Learn
- **Frontend**: HTML5, Vanilla CSS3 (Custom transitions & variables), JavaScript (ES6)
- **Data Visualization**: D3.js v7 (Data-driven SVG hierarchy rendering)
- **Design & Icons**: Google Fonts (Outfit & Space Grotesk), Lucide Icons

"An interactive clinical decision support system visualizing heart disease AI predictions via D3.js path tracing to enhance diagnostic interpretability and clinical trust."
