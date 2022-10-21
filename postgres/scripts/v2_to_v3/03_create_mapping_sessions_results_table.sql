/*
 * This script introduces a new table called 'mapping_sessions_results'
 * which holds all the shared information of the results
 * of a single mapping session by a user.
 */
set search_path = 'public';

CREATE TABLE IF NOT EXISTS mapping_sessions (
	project_id varchar,
    group_id varchar,
    user_id varchar,
    mapping_session_id bigserial unique, 
    start_time timestamp DEFAULT NULL,
    end_time timestamp DEFAULT NULL,
    items_count int2 not null,
    PRIMARY KEY (project_id, group_id, user_id),
    FOREIGN KEY (project_id, group_id)
    	REFERENCES groups (project_id, group_id),
    FOREIGN KEY (user_id) 
    	REFERENCES users (user_id)
);


CREATE TABLE IF NOT EXISTS mapping_sessions_results (
    mapping_session_id int8,
    task_id varchar,
	result int2 not null,    
    PRIMARY KEY (mapping_session_id, task_id),
    FOREIGN KEY (mapping_session_id)
    	references mapping_sessions (mapping_session_id)
);

