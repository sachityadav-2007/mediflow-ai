"""
Test Chronological Splitting and Feature Engineering
"""

import pandas as pd
from training.data_loader import chronological_split, generate_dev_pipeline_dataset

def test_chronological_splitting_zero_leakage():
    df = generate_dev_pipeline_dataset("waiting_time", n_samples=100, seed=42)
    train, val, test = chronological_split(df, time_col="timestamp", train_ratio=0.70, val_ratio=0.15)
    
    assert len(train) == 70
    assert len(val) == 15
    assert len(test) == 15
    
    # Verify temporal sequence: max(train) <= min(val) and max(val) <= min(test)
    assert train["timestamp"].max() <= val["timestamp"].min()
    assert val["timestamp"].max() <= test["timestamp"].min()

def test_dev_pipeline_dataset_provenance():
    df = generate_dev_pipeline_dataset("waiting_time", n_samples=50, seed=42)
    assert (df["dataset_provenance"] == "SYNTHETIC_DEVELOPMENT_PIPELINE").all()

