from typing import List
import datetime

import strawberry
import strawberry_django
from strawberry.scalars import JSON
from mapswipe.paginations import CountList, StrawberryDjangoCountList
from strawberry.types import Info

from .filters import UserMembershipFilter
from .models import (
    Project,
    User,
    UserGroup,
    UserGroupUserMembership,
    Organization
)
from .ordering import UserGroupUserMembershipOrder


@strawberry.type
class CommunityStatsType:
    total_contributors: int
    total_groups: int
    total_swipes: int


@strawberry.type
class ProjectTypeStats:
    area: float
    project_type: str


@strawberry.type
class ProjectSwipeTypeStats:
    project_type: str
    total_swipe: int


@strawberry.type
class CommunityStatsLatestType:
    total_contributors_last_month: int
    total_groups_last_month: int
    total_swipes_last_twenty_four_hour: int


@strawberry.type
class SwipeStatType:
    total_swipe: int
    total_swipe_time: int
    total_mapping_projects: int
    total_task: int


@strawberry.type
class UserLatestType:
    total_contributors: int
    total_groups: int
    total_swipes: int


@strawberry.type
class UserSwipeStatType:
    total_swipe: int
    total_swipe_time: int
    total_mapping_projects: int
    total_task: int
    total_user_group: int


@ strawberry.type
class ContributorType:
    total_swipe: int
    task_date: datetime.date


@strawberry.type
class ContributorTimeType:
    total_time: int
    date: datetime.date


@strawberry.type
class OrganizationTypeStats:
    organization_name: str
    total_swipe: int


@strawberry.type
class MapContributionTypeStats:
    geojson: str
    total_contribution: int


@strawberry.type
class UserLatestStatusTypeStats:
    total_user_group: int
    total_swipe: int
    total_swipe_time: float


@strawberry_django.type(Organization)
class OrganizationType:
    organization_id: strawberry.ID


@strawberry_django.type(User)
class UserType:
    user_id: strawberry.ID
    username: strawberry.auto

    @strawberry.field
    async def stats(self, info: Info, root: User) -> UserSwipeStatType:
        return await info.context[
            "dl"
        ].existing_database.load_user_stats.load(root.user_id)

    @strawberry.field
    async def contribution_stats(self, info: Info, root: User) -> List[ContributorType]:
        return await info.context[
            "dl"
        ].existing_database.load_user_contribution_stats.load(root.user_id)

    @strawberry.field
    async def contribution_time(self, info: Info, root: User) -> List[ContributorTimeType]:
        return await info.context[
            "dl"
        ].existing_database.load_user_time_spending.load(root.user_id)

    @strawberry.field
    async def project_stats(self, info: Info, root: User) -> List[ProjectTypeStats]:
        return await info.context[
            "dl"
        ].existing_database.load_user_stats_project_type.load(root.user_id)

    @strawberry.field
    async def project_swipe_stats(self, info: Info, root: User) -> List[ProjectSwipeTypeStats]:
        return await info.context[
            "dl"
        ].existing_database.load_user_stats_project_swipe_type.load(root.user_id)

    @strawberry_django.field
    async def organization_swipe_stats(self, info: Info, root: User) -> List[OrganizationTypeStats]:
        return await info.context[
            "dl"
        ].existing_database.load_user_organization_swipe_type.load(root.user_id)

    @strawberry.field
    async def stats_latest(self, info: Info, root: User) -> CommunityStatsLatestType:
        return await info.context[
            "dl"
        ].existing_database.load_user_latest_stats_query.load(root.user_id)

    @strawberry.field
    async def user_geo_contribution(self, info: Info, root: User) -> List[MapContributionTypeStats]:
        return await info.context[
            "dl"
        ].existing_database.load_user_geo_contribution.load(root.user_id)

    @strawberry.field
    async def user_stast_latest(self, info: Info, root: User) -> UserLatestStatusTypeStats:
        return await info.context[
            "dl"
        ].existing_database.load_user_stast_latest.load(root.user_id)


@strawberry_django.type(Project)
class ProjectType:
    project_id: strawberry.ID
    created: strawberry.auto
    name: strawberry.auto
    created_by: strawberry.auto
    progress: strawberry.auto
    project_details: strawberry.auto
    project_type: strawberry.auto
    required_results: strawberry.auto
    result_count: strawberry.auto
    status: strawberry.auto
    organization: OrganizationType
    geom: str


@strawberry_django.type(UserGroupUserMembership)
class UserGroupUserMembershipType:
    user: UserType
    is_active: strawberry.auto

    @strawberry.field
    async def stats(self, info: Info, root: UserGroupUserMembership) -> SwipeStatType:
        return await info.context[
            "dl"
        ].existing_database.load_user_group_user_stats.load(
            (root.user_group_id, root.user_id)
        )

    @strawberry.field
    async def contributors_stats(self, info: Info, root: UserGroupUserMembership) -> ContributorType:
        return await info.context[
            "dl"
        ].existing_database.load_user_group_user_contributors_stats.load(
            (root.user_group_id, root.user_id)
        )


@strawberry_django.type(UserGroup)
class UserGroupType:
    user_group_id: strawberry.ID
    name: strawberry.auto
    description: strawberry.auto
    created_by: UserType
    archived_by: UserType
    created_at: strawberry.auto
    archived_at: strawberry.auto
    is_archived: strawberry.auto

    # XXX: N+1
    user_memberships: CountList[
        UserGroupUserMembershipType
    ] = StrawberryDjangoCountList(
        pagination=True,
        filters=UserMembershipFilter,
        order=UserGroupUserMembershipOrder,
    )

    @strawberry.field
    async def stats(self, info: Info, root: UserGroup) -> SwipeStatType:
        return await info.context["dl"].existing_database.load_user_group_stats.load(
            root.user_group_id
        )

    @strawberry.field
    async def contibutors_stats(self, info: Info, root: UserGroup) -> List[ContributorType]:
        return await info.context["dl"].existing_database.load_user_group_contributors_stats.load(
            root.user_group_id
        )

    @strawberry.field
    async def project_type_stats(self, info: Info, root: UserGroup) -> ProjectTypeStats:
        return await info.context["dl"].existing_database.load_user_group_project_type_stats.load(
            root.user_group_id
        )

    @strawberry.field
    async def user_group_geo_stats(self, info: Info, root: UserGroup) -> List[MapContributionTypeStats]:
        return await info.context["dl"].existing_database.load_user_group_geo_contributions.load(
            root.user_group_id
        )

    def get_queryset(self, queryset, info, **kwargs):
        # Filter out user group without name. They aren't sync yet.
        return UserGroup.objects.exclude(name__isnull=True).all()
