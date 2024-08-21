import random

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.express as px
import warnings
warnings.filterwarnings('ignore')
plt.style.use('fivethirtyeight')

data = pd.read_csv("exoTest.csv")
print(data.head(5))
print(data.isnull().sum())  #no null values are there in our dataset.
new_data = data[["LABEL","FLUX.1","FLUX.2","FLUX.3","FLUX.4","FLUX.5"]]
print(new_data.columns)


print(data['LABEL'].value_counts())

from sklearn.model_selection import train_test_split
random.seed(42)
train_df,test_df = train_test_split(new_data,test_size=0.1,random_state=42)
train_inputs = train_df.drop(["LABEL"],axis=1)
train_targets = train_df["LABEL"]
test_inputs = test_df.drop(["LABEL"],axis=1)
test_targets = test_df["LABEL"]

print(train_targets.head(5))
print(train_inputs.columns)

from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
model1 = LogisticRegression()
model1.fit(train_inputs,train_targets)
predict1 = model1.predict(train_inputs)
predict2 = model1.predict(test_inputs)
a1 = accuracy_score(predict1,train_targets)
print(a1)

from sklearn.ensemble import HistGradientBoostingClassifier
model2 = HistGradientBoostingClassifier()
model2.fit(train_inputs,train_targets)
p2 = model2.predict(train_inputs)
p3 = model2.predict(test_inputs)
a1 = accuracy_score(p2,train_targets)
a2 = accuracy_score(p3,test_targets)
print(a1,a2)

f1 = float(input("Enter the flux1: "))
f2 = float(input("Enter the flux2: "))
f3 = float(input("Enter the flux3: "))
f4 = float(input("Enter the flux4: "))
f5 = float(input("Enter the flux5: "))

# Create a dictionary with the input values
input_data = {
    'FLUX.1': [f1],
    'FLUX.2': [f2],
    'FLUX.3': [f3],
    'FLUX.4': [f4],
    'FLUX.5': [f5]

}

# Convert the dictionary to a DataFrame
input_df = pd.DataFrame(input_data)
print(input_df)

predict_input = model2.predict(input_df)
print(predict_input)