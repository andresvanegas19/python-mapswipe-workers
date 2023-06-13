import unittest

from click.testing import CliRunner

from mapswipe_workers import mapswipe_workers
from mapswipe_workers.definitions import DATA_PATH
from mapswipe_workers.generate_stats.overall_stats import get_project_static_info
from mapswipe_workers.utils.create_directories import create_directories
from tests.integration import set_up, tear_down


class TestOverallStats(unittest.TestCase):
    def setUp(self):
        self.project_id_with_custom_answers = set_up.create_test_project_draft(
            "tile_classification", "tile_classification", "tile_classification"
        )
        self.project_id_without_custom_answers = set_up.create_test_project_draft(
            "tile_classification",
            "tile_classification_with_additional_attributes",
            "tile_classification_with_additional_attributes",
        )
        create_directories()

    def tearDown(self):
        tear_down.delete_test_data(self.project_id_with_custom_answers)
        tear_down.delete_test_data(self.project_id_without_custom_answers)

    def test_get_project_static_info_custom_answer_retrieval(self):
        runner = CliRunner()
        runner.invoke(mapswipe_workers.run_create_projects, catch_exceptions=False)

        df = get_project_static_info(f"{DATA_PATH}/api/projects/projects_static.csv")
        answer_label_values = list(df["answer_label_values"])
        self.assertListEqual(
            sorted(answer_label_values), sorted(["{-999,1,2,3}", "{0,1,2,3}"])
        )


if __name__ == "__main__":
    unittest.main()
