import os
import pathlib

from mapswipe_workers.definitions import DATA_PATH

dirs = (
    "/api",
    "/api/agg_results",
    "/api/groups",
    "/api/history",
    "/api/hot_tm",
    "/api/project_geometries",
    "/api/projects",
    "/api/results",
    "/api/tasks",
    "/api/users",
    "/api/yes_maybe",
)


def create_directories() -> None:
    """Create directories"""

    for dir_name in dirs:
        path = pathlib.Path(DATA_PATH + dir_name)
        # mimicking the POSIX mkdir -p command
        path.mkdir(parents=True, exist_ok=True)


def clear_directories(filelist: list) -> None:
    for file_name in filelist:
        try:
            os.remove(file_name)
        except OSError:  # happens if no file is present
            pass
