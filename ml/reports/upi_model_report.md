# UPI Model Report

The dataset is synthetic.

Upon inspecting the dataset and computing a univariate test (Kruskal-Wallis / Chi-Square) against the label `is_suspicious`, we found that only 2 derivable features showed statistical significance:
- `amount` (p-value 2.10e-139)
- `hour_of_day` (p-value 1.17e-193)

Other derivable features either had no signal (p-value 1.0) or were not present in the dataset. Because fewer than 3 derivable features showed real signal, we stopped. We are not building the transaction layer model to prevent faking it.
