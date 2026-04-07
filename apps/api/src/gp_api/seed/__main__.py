import sys

from gp_api.seed.cli import main, reset_metrics_and_seed

if __name__ == "__main__":
    if "--reset-metrics" in sys.argv:
        reset_metrics_and_seed()
    else:
        main()
