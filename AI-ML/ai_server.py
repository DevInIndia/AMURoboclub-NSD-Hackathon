from flask import Flask, request, jsonify
import exoplanet  # Replace with your actual ML model module

app = Flask(__name__)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    flux_values = [
        data['flux1'],
        data['flux2'],
        data['flux3'],
        data['flux4'],
        data['flux5']
    ]

    # Call your AI/ML model with the flux values
    result = exoplanet.predict(flux_values)

    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
