import os
import sys

modelPath = sys.argv[1]

append_file_path = os.path.expanduser("~/Downloads/data_append.csv")

with open(append_file_path, "r") as append_file:
    append = append_file.read()

with open(f"./models/{modelPath}/data/model_data.csv", "r+") as data_file:
    first_line = data_file.readline()
    if not first_line:
        columns = f"{','.join(str(i) for i in range(0, 49152))},label"
        data_file.write(f"{columns}\n")
    data_file.seek(0, os.SEEK_END)
    data_file.write(f"{append}\n")

os.remove(append_file_path)
