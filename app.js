// State Variables
let featureMetadata = [];
let treeData = null;
let datasetSamples = [];
let activeSampleIndex = null;

// D3 Tree variables
let svg, g, zoom;
let rootNode;
let allNodesMap = {}; // Maps node.id to hierarchy node reference

// DOM Elements
const formContainer = document.getElementById("features-form-container");
const predictionForm = document.getElementById("prediction-form");
const samplesContainer = document.getElementById("samples-container");
const btnLoadSamples = document.getElementById("btn-load-samples");
const resultCard = document.getElementById("prediction-output-card");

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
    initApp();
    setupEventListeners();
});

async function initApp() {
    try {
        // Fetch feature metadata
        const featRes = await fetch("/api/features");
        featureMetadata = await featRes.json();
        renderForm(featureMetadata);

        // Fetch tree structure
        const treeRes = await fetch("/api/tree-data");
        treeData = await treeRes.json();
        
        // Build map of nodes for easy path mapping
        buildNodeMap(treeData);
        
        // Render tree visualization
        renderTree(treeData);
        
        // Fetch samples initially
        fetchSamples();
    } catch (err) {
        console.error("Initialization error:", err);
    }
}

function setupEventListeners() {
    // Form submission
    predictionForm.addEventListener("submit", handleFormSubmit);

    // Sample loading
    btnLoadSamples.addEventListener("click", fetchSamples);

    // Zoom controls
    document.getElementById("btn-zoom-in").addEventListener("click", () => {
        svg.transition().duration(300).call(zoom.scaleBy, 1.3);
    });
    document.getElementById("btn-zoom-out").addEventListener("click", () => {
        svg.transition().duration(300).call(zoom.scaleBy, 0.7);
    });
    document.getElementById("btn-zoom-reset").addEventListener("click", () => {
        svg.transition().duration(500).call(
            zoom.transform,
            d3.zoomIdentity.translate(80, 50).scale(0.6)
        );
    });
}

// Map tree nodes recursively by ID
function buildNodeMap(node) {
    if (!node) return;
    allNodesMap[node.id] = node;
    if (node.left) buildNodeMap(node.left);
    if (node.right) buildNodeMap(node.right);
}

// Fetch samples from backend
async function fetchSamples() {
    samplesContainer.innerHTML = `<span class="loading-placeholder">Loading records...</span>`;
    try {
        const res = await fetch("/api/samples");
        datasetSamples = await res.json();
        renderSamples(datasetSamples);
    } catch (err) {
        samplesContainer.innerHTML = `<span class="loading-placeholder" style="color:var(--color-risk)">Failed to load.</span>`;
    }
}

// Render sample pills
function renderSamples(samples) {
    samplesContainer.innerHTML = "";
    samples.forEach((sample, idx) => {
        const pill = document.createElement("button");
        pill.type = "button";
        const hasDisease = sample.target === 1;
        pill.className = `sample-pill ${hasDisease ? 'has-disease' : 'no-disease'}`;
        pill.innerHTML = `Case #${idx + 1} (${hasDisease ? 'Risk' : 'Healthy'})`;
        
        pill.addEventListener("click", () => {
            // Remove active class
            document.querySelectorAll(".sample-pill").forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            activeSampleIndex = idx;
            
            // Populate form
            populateForm(sample);
            
            // Automatically trigger prediction
            triggerPrediction();
        });
        
        samplesContainer.appendChild(pill);
    });
}

// Populate form controls
function populateForm(sample) {
    featureMetadata.forEach(feat => {
        const el = document.getElementById(`input-${feat.name}`);
        if (!el) return;
        
        const val = sample[feat.name];
        el.value = val;
        
        // If range slider, update numerical display
        const valDisp = document.getElementById(`val-${feat.name}`);
        if (valDisp) {
            valDisp.textContent = feat.step ? Number(val).toFixed(1) : Math.round(val);
        }
        
        // If binary switch buttons
        if (feat.type === "binary") {
            const btnGroup = el.parentElement;
            btnGroup.querySelectorAll(".switch-btn").forEach(btn => {
                if (parseInt(btn.dataset.value) === parseInt(val)) {
                    btn.classList.add("active");
                } else {
                    btn.classList.remove("active");
                }
            });
        }
    });
}

// Dynamically render inputs
function renderForm(metadata) {
    formContainer.innerHTML = "";
    metadata.forEach(feat => {
        const group = document.createElement("div");
        group.className = "form-group";
        
        const label = document.createElement("label");
        label.setAttribute("for", `input-${feat.name}`);
        
        const labelText = document.createElement("span");
        labelText.textContent = feat.label;
        label.appendChild(labelText);
        
        if (feat.type === "continuous") {
            // Slider
            const valDisplay = document.createElement("span");
            valDisplay.className = "value-display";
            valDisplay.id = `val-${feat.name}`;
            valDisplay.textContent = feat.default;
            label.appendChild(valDisplay);
            group.appendChild(label);
            
            const slider = document.createElement("input");
            slider.type = "range";
            slider.id = `input-${feat.name}`;
            slider.name = feat.name;
            slider.min = feat.min;
            slider.max = feat.max;
            slider.step = feat.step || 1;
            slider.value = feat.default;
            
            slider.addEventListener("input", (e) => {
                valDisplay.textContent = feat.step ? parseFloat(e.target.value).toFixed(1) : Math.round(e.target.value);
            });
            group.appendChild(slider);
            
        } else if (feat.type === "binary") {
            // Custom switches
            group.appendChild(label);
            
            const btnGroup = document.createElement("div");
            btnGroup.className = "binary-switch-group";
            
            // Hidden input to hold value
            const hidden = document.createElement("input");
            hidden.type = "hidden";
            hidden.id = `input-${feat.name}`;
            hidden.name = feat.name;
            hidden.value = feat.default;
            btnGroup.appendChild(hidden);
            
            feat.options.forEach(opt => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "switch-btn";
                if (opt.value === feat.default) btn.classList.add("active");
                btn.textContent = opt.label;
                btn.dataset.value = opt.value;
                
                btn.addEventListener("click", () => {
                    btnGroup.querySelectorAll(".switch-btn").forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");
                    hidden.value = opt.value;
                });
                
                btnGroup.appendChild(btn);
            });
            
            group.appendChild(btnGroup);
            
        } else if (feat.type === "categorical") {
            // Select dropdown
            group.appendChild(label);
            
            const select = document.createElement("select");
            select.id = `input-${feat.name}`;
            select.name = feat.name;
            
            feat.options.forEach(opt => {
                const o = document.createElement("option");
                o.value = opt.value;
                o.text = opt.label;
                if (opt.value === feat.default) o.selected = true;
                select.appendChild(o);
            });
            
            group.appendChild(select);
        }
        
        formContainer.appendChild(group);
    });
}

// Trigger Form Submission Programmatically
function triggerPrediction() {
    // Dispatch submit event to form
    const event = new Event('submit', { cancelable: true });
    predictionForm.dispatchEvent(event);
}

// Handle Form Submit
async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(predictionForm);
    const payload = {};
    featureMetadata.forEach(feat => {
        payload[feat.name] = parseFloat(formData.get(feat.name));
    });
    
    try {
        const res = await fetch("/api/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.error) {
            alert("Error running prediction: " + result.error);
            return;
        }
        
        displayResults(result, payload);
        highlightDecisionPath(result.decision_path);
    } catch (err) {
        console.error("Prediction submission error:", err);
    }
}

// Display results in sidebar
function displayResults(result, payload) {
    // Show results section
    resultCard.classList.remove("result-placeholder-state");
    resultCard.querySelector(".placeholder-content").classList.add("hidden");
    const content = resultCard.querySelector(".results-content");
    content.classList.remove("hidden");
    
    // Update Risk Gauge
    const diseaseProb = result.probabilities[1];
    const percentage = Math.round(diseaseProb * 100);
    const progressEl = document.getElementById("gauge-progress");
    const textEl = document.getElementById("gauge-percentage");
    
    // Animate radial gauge
    // Circumference of R=40 is 251.2
    const circumference = 251.2;
    const strokeDashoffset = circumference - (circumference * diseaseProb);
    progressEl.style.strokeDashoffset = strokeDashoffset;
    textEl.textContent = `${percentage}%`;
    
    // Color gauge depending on risk
    if (diseaseProb > 0.5) {
        progressEl.style.stroke = "var(--color-risk)";
        progressEl.style.filter = "drop-shadow(0px 0px 4px var(--color-risk-glow))";
    } else {
        progressEl.style.stroke = "var(--color-healthy)";
        progressEl.style.filter = "drop-shadow(0px 0px 4px var(--color-healthy-glow))";
    }
    
    // Update Diagnosis Status Card
    const diagCard = document.getElementById("diagnosis-card");
    const diagIcon = document.getElementById("diagnosis-icon");
    const diagTitle = document.getElementById("diagnosis-title");
    const diagDesc = document.getElementById("diagnosis-description");
    
    diagCard.className = "diagnosis-status-card";
    
    if (result.prediction === 1) {
        diagCard.classList.add("status-risk");
        diagIcon.setAttribute("data-lucide", "alert-triangle");
        diagTitle.textContent = "Positive Result";
        diagDesc.textContent = `Patient shows significant indicators of heart disease (Confidence: ${percentage}%). Recommend cardiological follow-up.`;
    } else {
        diagCard.classList.add("status-healthy");
        diagIcon.setAttribute("data-lucide", "shield-check");
        diagTitle.textContent = "Negative Result";
        diagDesc.textContent = `Patient shows low signs of heart disease (Confidence: ${100 - percentage}%). Parameters are within normal boundaries.`;
    }
    
    // Update timeline steps
    const timeline = document.getElementById("decision-steps-list");
    timeline.innerHTML = "";
    
    // Build steps dynamically from the decision path
    const path = result.decision_path;
    path.forEach((nodeId, index) => {
        const node = allNodesMap[nodeId];
        if (!node) return;
        
        const stepDiv = document.createElement("div");
        stepDiv.className = "timeline-step active";
        
        if (node.is_leaf) {
            stepDiv.classList.add("leaf-step");
            if (node.prediction === 1) {
                stepDiv.classList.add("risk");
                stepDiv.innerHTML = `
                    <span class="step-rule">Leaf Node Reached (ID: ${node.id})</span>
                    <span class="step-outcome" style="color:var(--color-risk); font-weight:700">Heart Disease Prediction</span>
                    <span class="step-details">Confidence split: ${node.value[0]} healthy vs ${node.value[1]} risk</span>
                `;
            } else {
                stepDiv.classList.add("healthy");
                stepDiv.innerHTML = `
                    <span class="step-rule">Leaf Node Reached (ID: ${node.id})</span>
                    <span class="step-outcome" style="color:var(--color-healthy); font-weight:700">Healthy Prediction</span>
                    <span class="step-details">Confidence split: ${node.value[0]} healthy vs ${node.value[1]} risk</span>
                `;
            }
        } else {
            // Find next node in path to see if it went Left or Right
            const nextNodeId = path[index + 1];
            const wentLeft = node.left.id === nextNodeId;
            const operator = "<=";
            const thresholdFormatted = node.threshold.toFixed(2);
            
            // Get user's value
            const userVal = payload[node.feature_name];
            const meta = featureMetadata.find(f => f.name === node.feature_name);
            const userValStr = meta.step ? userVal.toFixed(1) : Math.round(userVal);
            
            stepDiv.innerHTML = `
                <span class="step-rule">Node ID: ${node.id} — Split on ${meta ? meta.label : node.feature_name}</span>
                <span class="step-outcome">Rule: ${node.feature_name} ${operator} ${thresholdFormatted}</span>
                <span class="step-details">Patient value is <strong>${userValStr}</strong> -> Evaluates to <strong>${wentLeft}</strong> (${wentLeft ? 'Left branch' : 'Right branch'})</span>
            `;
        }
        timeline.appendChild(stepDiv);
    });
    
    // Refresh icons
    lucide.createIcons();
}

// Render Decision Tree Graph using D3.js
function renderTree(data) {
    const margin = { top: 40, right: 90, bottom: 40, left: 120 };
    const width = 2400; // Large width for expanded tree horizontal flow
    const height = 1100; // Keep height relatively compact but readable
    
    // Create D3 Hierarchy structure
    rootNode = d3.hierarchy(data, d => {
        const children = [];
        if (d.left) children.push(d.left);
        if (d.right) children.push(d.right);
        return children;
    });
    
    // Generate Tree positions
    const treemap = d3.tree().size([height - margin.top - margin.bottom, width - margin.left - margin.right]);
    treemap(rootNode);
    
    // SVG selection & size configuration
    svg = d3.select("#tree-svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("width", "100%")
        .attr("height", "100%");
        
    // Setup Zoom behaviors
    zoom = d3.zoom()
        .scaleExtent([0.1, 3])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });
        
    svg.call(zoom);
    
    // G elements wrapper for zoom
    g = svg.append("g")
        .attr("class", "tree-group")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);
        
    // Zoom out slightly to fit initial tree
    svg.call(zoom.transform, d3.zoomIdentity.translate(80, 50).scale(0.6));
    
    // Draw links
    g.selectAll(".link")
        .data(rootNode.links())
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("id", d => `link-${d.source.data.id}-${d.target.data.id}`)
        .attr("d", d3.linkHorizontal()
            .x(d => d.y)
            .y(d => d.x)
        );
        
    // Draw nodes
    const node = g.selectAll(".node")
        .data(rootNode.descendants())
        .enter()
        .append("g")
        .attr("class", d => {
            let cls = "node";
            if (d.data.is_leaf) {
                cls += d.data.prediction === 1 ? " leaf-risk" : " leaf-healthy";
            } else {
                cls += " decision-node";
            }
            return cls;
        })
        .attr("id", d => `node-${d.data.id}`)
        .attr("transform", d => `translate(${d.y}, ${d.x})`);
        
    // Add circle element to nodes
    node.append("circle")
        .attr("r", 7.5);
        
    // Add text label
    node.append("text")
        .attr("dy", ".35em")
        .attr("x", d => d.data.is_leaf ? 12 : -12)
        .attr("text-anchor", d => d.data.is_leaf ? "start" : "end")
        .text(d => {
            if (d.data.is_leaf) {
                return d.data.prediction === 1 ? "Risk" : "Healthy";
            }
            // Format nice feature condition split label
            const meta = featureMetadata.find(f => f.name === d.data.feature_name);
            const labelName = meta ? meta.label : d.data.feature_name;
            return `${labelName} <= ${d.data.threshold.toFixed(1)}`;
        })
        .style("font-weight", d => d.data.is_leaf ? "700" : "500")
        .style("fill", d => {
            if (d.data.is_leaf) {
                return d.data.prediction === 1 ? "var(--color-risk)" : "var(--color-healthy)";
            }
            return "var(--text-primary)";
        });

    // Hover Interaction: Tooltip display
    const tooltip = document.getElementById("tree-tooltip");
    
    node.on("mouseover", (event, d) => {
        tooltip.style.opacity = 1;
        
        let contentHtml = "";
        if (d.data.is_leaf) {
            contentHtml = `
                <div style="font-weight:700; color:${d.data.prediction === 1 ? 'var(--color-risk)' : 'var(--color-healthy)'}">
                    Leaf Node #${d.data.id} (${d.data.prediction === 1 ? 'Risk' : 'Healthy'})
                </div>
                <div>Samples: ${d.data.samples}</div>
                <div>Class Split: ${d.data.value[0]} vs ${d.data.value[1]}</div>
            `;
        } else {
            const meta = featureMetadata.find(f => f.name === d.data.feature_name);
            contentHtml = `
                <div style="font-weight:700; color:var(--color-primary)">Decision Node #${d.data.id}</div>
                <div style="margin:4px 0">Split Rule: <strong>${d.data.feature_name} &lt;= ${d.data.threshold.toFixed(2)}</strong></div>
                <div>Feature: ${meta ? meta.label : d.data.feature_name}</div>
                <div>Samples remaining: ${d.data.samples}</div>
                <div>Class distribution: [${d.data.value[0]}, ${d.data.value[1]}]</div>
            `;
        }
        tooltip.innerHTML = contentHtml;
    })
    .on("mousemove", (event) => {
        // Calculate offset position within viewport container
        const containerRect = document.querySelector(".viz-container").getBoundingClientRect();
        tooltip.style.left = (event.clientX - containerRect.left + 15) + "px";
        tooltip.style.top = (event.clientY - containerRect.top + 15) + "px";
    })
    .on("mouseout", () => {
        tooltip.style.opacity = 0;
    });
}

// Highlight decision path in D3 Tree
function highlightDecisionPath(pathNodeIds) {
    // 1. Remove all highlighting classes
    svg.classed("tree-dimmed", true);
    d3.selectAll(".node").classed("path-active", false);
    d3.selectAll("path.link").classed("active", false);
    
    // 2. Add classes to traversed elements
    pathNodeIds.forEach((nodeId, idx) => {
        // Highlight Node
        d3.select(`#node-${nodeId}`).classed("path-active", true);
        
        // Highlight Link (connecting to next node in path)
        if (idx < pathNodeIds.length - 1) {
            const nextNodeId = pathNodeIds[idx + 1];
            d3.select(`#link-${nodeId}-${nextNodeId}`).classed("active", true);
        }
    });
    
    // 3. Zoom / Center on the active leaf node to draw user attention
    const leafNodeId = pathNodeIds[pathNodeIds.length - 1];
    const leafHierarchyNode = rootNode.descendants().find(d => d.data.id === leafNodeId);
    
    if (leafHierarchyNode) {
        // Center SVG viewport on the target leaf coordinates
        const margin = { left: 120, top: 40 };
        const containerWidth = document.querySelector(".viz-container").clientWidth;
        const containerHeight = document.querySelector(".viz-container").clientHeight;
        
        // Target translates
        // D3 tree sizes layout nodes horizontally on y-axis, and vertically on x-axis
        const targetX = leafHierarchyNode.y;
        const targetY = leafHierarchyNode.x;
        
        // We scale zoom slightly and center the leaf on the screen
        const scaleVal = 0.8;
        const translateX = containerWidth / 2 - targetX * scaleVal - 100;
        const translateY = containerHeight / 2 - targetY * scaleVal;
        
        svg.transition()
            .duration(800)
            .call(
                zoom.transform,
                d3.zoomIdentity.translate(translateX, translateY).scale(scaleVal)
            );
    }
}
