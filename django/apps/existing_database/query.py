from typing import List

from django.conf import settings
from django.db import connections

import strawberry
import strawberry_django
from mapswipe.paginations import CountList, StrawberryDjangoCountList

from .filters import (
    ProjectFilter,
    UserGroupFilter,
    UserFilter
)
from .ordering import UserGroupOrder
from .types import (
    ProjectType,
    UserGroupType,
    UserType,
    CommunityStatsType,
    CommunityStatsLatestType,
    ContributorTimeType,
    ProjectTypeStats,
    OrganizationTypeStats
)
from .models import (
    Result,
    UserGroupResult,
    Project
)


def get_community_stats() -> CommunityStatsType:
    # TODO: Handle group by giving wrong results
    COMMUNITY_DAHBOARD_STATS_QUERY = f"""
        WITH
            dashboard_data AS (
                SELECT
                    UGR.user_group_id as user_group_id,
                    COUNT(*) swipe_count,
                    R.user_id as user_id
                From {Result._meta.db_table} R
                    LEFT JOIN {UserGroupResult._meta.db_table} UGR USING (user_id)
                GROUP BY user_group_id, user_id
            )
        SELECT
            COUNT( DISTINCT user_group_id) as total_groups,
            COUNT(DISTINCT user_id) as total_users,
            SUM(swipe_count) as total_swipes
        From dashboard_data
    """
    with connections[settings.MAPSWIPE_EXISTING_DB].cursor() as cursor:
        cursor.execute(COMMUNITY_DAHBOARD_STATS_QUERY)
        aggregate_results = cursor.fetchall()
    for data in aggregate_results:
        return CommunityStatsType(
            total_contributors=data[0] or 0,
            total_groups=data[1] or 0,
            total_swipes=data[2] or 0,
        )


def get_community_stats_latest() -> CommunityStatsLatestType:
    COMMUNITY_DAHBOARD_STATS_QUERY = f"""
        WITH
            -- Group by project_id, group_id, user_id and user_group_id to get
            -- Max start_time and end_time as they are repeated for each task,
            -- but the value is at project_id, group_id, user_id level
            dashboard_data AS (
                SELECT
                    UGR.user_group_id as user_group_id,
                    R.user_id as user_id,
                    R.timestamp as timestamp
                From {Result._meta.db_table} R
                    LEFT JOIN {UserGroupResult._meta.db_table} UGR USING (user_id)
                WHERE timestamp::date >= (CURRENT_DATE- INTERVAL '30 days')
                GROUP BY user_group_id, user_id, timestamp
            ),
            dashboard_twenty_four AS(
                SELECT
                    COUNT(*) swipe_count,
                    R.timestamp as timestamp
                From {Result._meta.db_table} R
                WHERE timestamp::date >= (CURRENT_DATE- INTERVAL '30 days')
                GROUP BY timestamp

            )
        SELECT
            COUNT( DISTINCT user_group_id) as total_groups,
            COUNT(DISTINCT user_id) as total_users,
            SUM(swipe_count) as total_swipes
        From dashboard_data, dashboard_twenty_four

    """
    with connections[settings.MAPSWIPE_EXISTING_DB].cursor() as cursor:
        cursor.execute(COMMUNITY_DAHBOARD_STATS_QUERY)
        aggregate_results = cursor.fetchall()
    for data in aggregate_results:
        return CommunityStatsLatestType(
            total_contributors_last_month=data[0] or 0,
            total_groups_last_month=data[1] or 0,
            total_swipes_last_twenty_four_hour=data[2] or 0,
        )


def get_contributor_time_stats() -> List[ContributorTimeType]:
    COMMUNITY_DASHBOARD_STATS_QUERY = f"""
        WITH
        user_data AS (
            SELECT
                MAX(R.start_time) as start_time,
                MAX(R.end_time) as end_time,
                R.timestamp as timestamp
            From {Result._meta.db_table} R
            GROUP BY timestamp
        )
    SELECT
        timestamp::date as task_date,
        SUM(
            EXTRACT(
                EPOCH FROM (end_time - start_time)
            )
        ) as total_time
    From user_data
    GROUP BY timestamp
    """
    with connections[settings.MAPSWIPE_EXISTING_DB].cursor() as cursor:
        cursor.execute(COMMUNITY_DASHBOARD_STATS_QUERY)
        aggregate_results = cursor.fetchall()
    list_data = []
    for data in aggregate_results:
        list_data.append(
            ContributorTimeType(
                total_time=round(data[1] / 60) or 0,
                date=data[0] or None,
            )
        )
    return list_data


def get_project_type_query() -> ProjectTypeStats:
    PROJECT_TYPE_STATS_QUERY = f"""
        WITH
            project_data_type1 AS (
                SELECT
                    st_area(P.geom) as area_sum_1
                    FROM {Project._meta.db_table} P
                        LEFT JOIN {Result._meta.db_table} R USING (project_id)
                WHERE P.project_type=1
                ),
            project_data_type2 AS (
                SELECT
                    st_area(geom) as area_sum_2
                    FROM {Project._meta.db_table} P
                        LEFT JOIN {Result._meta.db_table} R USING (project_id)
                WHERE P.project_type=2
            ),
            project_data_type3 AS (
                SELECT
                    st_area(geom) as area_sum_3
                    FROM {Project._meta.db_table} P
                        LEFT JOIN {Result._meta.db_table} R USING (project_id)
                WHERE P.project_type=3
            )
        SELECT
            SUM(area_sum_1) as area_sum_1,
            SUM(area_sum_2) as area_sum_2,
            SUM(area_sum_3) as area_sum_3
        From project_data_type1, project_data_type2, project_data_type3
    """
    with connections[settings.MAPSWIPE_EXISTING_DB].cursor() as cursor:
        cursor.execute(PROJECT_TYPE_STATS_QUERY)
        aggregate_results = cursor.fetchall()
    for data in aggregate_results:
        return ProjectTypeStats(
            build_area=data[0] or 0,
            footprint=data[1] or 0,
            change_detection=data[2] or 0
        )


def get_organization_stats() -> List[OrganizationTypeStats]:
    COMMUNITY_DASHBOARD_STATS_QUERY = f"""
        WITH
            user_data AS (
                SELECT
                    COUNT(*) swipe_count,
                    P.organization_id as organization
                From {Result._meta.db_table} R
                    LEFT JOIN {Project._meta.db_table} as P USING
                        (project_id)
                GROUP BY organization
            )
        SELECT
            SUM(swipe_count) as swipe_count,
            organization
        From user_data
        GROUP BY organization
    """
    with connections[settings.MAPSWIPE_EXISTING_DB].cursor() as cursor:
        cursor.execute(COMMUNITY_DASHBOARD_STATS_QUERY)
        aggregate_results = cursor.fetchall()
    list_data = []
    for data in aggregate_results:
        list_data.append(
            OrganizationTypeStats(
                organization_name=data[1] or None,
                total_swipe=data[0] or 0,
            )
        )
    return list_data


@strawberry.type
class Query:
    users: CountList[UserType] = StrawberryDjangoCountList(
        pagination=True,
        filters=UserFilter
    )
    projects: CountList[ProjectType] = StrawberryDjangoCountList(
        pagination=True,
        filters=ProjectFilter,
    )

    user_groups: CountList[UserGroupType] = StrawberryDjangoCountList(
        pagination=True,
        filters=UserGroupFilter,
        order=UserGroupOrder,
    )

    user_group: UserGroupType = strawberry_django.field()
    user: UserType = strawberry_django.field()
    community_stats: CommunityStatsType = strawberry_django.field(get_community_stats)
    community_stast_lastest: CommunityStatsLatestType = strawberry_django.field(get_community_stats_latest)
    contributor_time_sats: ContributorTimeType = strawberry_django.field(get_contributor_time_stats)
    project_type_stats: ProjectTypeStats = strawberry_django.field(get_project_type_query)
    organization_type_stats: OrganizationTypeStats = strawberry_django.field(get_organization_stats)
