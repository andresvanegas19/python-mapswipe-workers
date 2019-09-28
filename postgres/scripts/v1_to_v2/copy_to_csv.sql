-- Export v1 MapSwipe data to csv.
-- Rename attributes to conform to v2.
\copy (SELECT archive, image, importkey as "import_id", isfeatured AS "is_featured", lookfor AS "look_for", name, progress, projectdetails AS "project_details", project_id, project_type, state AS "status", info AS "project_type_specifics" FROM projects WHERE project_id in (select project_id from results group by project_id)) TO projects.csv WITH (FORMAT CSV, DELIMITER ",", HEADER TRUE);
\copy (SELECT i.import_id, i.info FROM imports i WHERE import_id in (select importkey as import_id from projects)) TO imports.csv WITH (FORMAT CSV, DELIMITER ",", HEADER TRUE);
\copy (SELECT project_id, group_id as "v1_group_id", count as "number_of_tasks", completedcount as "finished_count", verificationcount as "required_count", info as "project_type_specifics" FROM groups WHERE project_id in (select project_id from projects group by project_id) and project_id in (select project_id from results group by project_id) ) TO groups.csv WITH (FORMAT CSV, DELIMITER ",", HEADER TRUE);
\copy (SELECT project_id, group_id as "v1_group_id", task_id, info as "project_type_specifics" FROM tasks WHERE project_id in (select project_id from projects group by project_id) and project_id in (select project_id from results group by project_id)) TO tasks.csv WITH (FORMAT CSV, DELIMITER ",", HEADER TRUE);
