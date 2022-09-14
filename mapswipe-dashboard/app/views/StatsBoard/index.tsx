import React, { useMemo } from 'react';
import {
    isDefined,
    listToGroupList,
    mapToList,
    _cs,
    sum,
    compareNumber,
    listToMap,
} from '@togglecorp/fujs';
import { scaleOrdinal } from 'd3-scale';
import {
    AreaChart,
    ResponsiveContainer,
    XAxis,
    YAxis,
    Area,
    Tooltip,
    PieChart,
    Pie,
    Legend,
    Cell,
    BarChart,
    Bar,
} from 'recharts';
// import { formatDuration, intervalToDuration } from 'date-fns';

import ContributionHeatmap, { MapContributionType } from '#components/ContributionHeatMap';
import NumberOutput from '#components/NumberOutput';
import TextOutput from '#components/TextOutput';
import Heading from '#components/Heading';

import InformationCard from '#components/InformationCard';
import areaSvg from '#resources/icons/area.svg';
import sceneSvg from '#resources/icons/scene.svg';
import featureSvg from '#resources/icons/feature.svg';
import {
    ContributorTimeType,
    OrganizationTypeStats,
    ProjectSwipeTypeStats,
    ProjectTypeStats,
} from '#generated/types';

import StatsContainer from './StatsContainer';
import styles from './styles.css';

function mergeItems<T, K extends string>(
    list: T[],
    keySelector: (item: T) => K,
    merge: (prev: T, item: T, key: K) => T,
): T[] {
    const mapping: {
        [key: string]: T | undefined;
    } = {};
    list.forEach((item) => {
        const key = keySelector(item);
        const prev = mapping[key];
        if (!prev) {
            mapping[key] = prev;
        } else {
            mapping[key] = merge(prev, item, key);
        }
    });
    return Object.values(list);
}

function removeTime(date: Date | number | string, resolution: 'day' | 'month' | 'year'): Date {
    const newDate = new Date(date);
    if (resolution === 'day' || resolution === 'month' || resolution === 'year') {
        newDate.setUTCHours(0, 0, 0, 0);
    }
    if (resolution === 'month' || resolution === 'year') {
        newDate.setDate(1);
    }
    if (resolution === 'year') {
        newDate.setMonth(0);
    }
    return newDate;
}

function getTimestamps(
    startDate: Date | number | string,
    endDate: Date | number | string,
    resolution: 'day' | 'month' | 'year',
) {
    const sanitizedStartDate = removeTime(startDate, resolution);
    const sanitizedEndDate = removeTime(endDate, resolution);

    const returns: number[] = [
        sanitizedStartDate.getTime(),
    ];

    while (sanitizedStartDate < sanitizedEndDate) {
        if (resolution === 'year') {
            sanitizedStartDate.setFullYear(sanitizedStartDate.getFullYear() + 1);
        } else if (resolution === 'month') {
            sanitizedStartDate.setMonth(sanitizedStartDate.getMonth() + 1);
        } else {
            sanitizedStartDate.setDate(sanitizedStartDate.getDate() + 1);
        }
        returns.push(sanitizedStartDate.getTime());
    }

    return returns;
}

const UNKNOWN = '-1';
const BUILD_AREA = '1';
const FOOT_PRINT = '2';
const CHANGE_DETECTION = '3';
const COMPLETENESS = '4';

const projectTypes: Record<string, { color: string, name: string }> = {
    [UNKNOWN]: {
        color: '#808080',
        name: 'Unknown',
    },
    [BUILD_AREA]: {
        color: '#f8a769',
        name: 'Build Area',
    },
    [FOOT_PRINT]: {
        color: '#bbcb7d',
        name: 'Footprint',
    },
    [CHANGE_DETECTION]: {
        color: '#79aeeb',
        name: 'Change Detection',
    },
    [COMPLETENESS]: {
        color: '#fb8072',
        name: 'Completeness',
    },
};

function formatDate(value: number | string) {
    const date = new Date(value);
    return new Intl.DateTimeFormat(
        'en-US',
        { year: 'numeric', month: 'short', day: 'numeric' },
    ).format(date);
}

function formatMonth(value: number | string) {
    const date = new Date(value);
    return new Intl.DateTimeFormat(
        'en-US',
        { year: 'numeric', month: 'short' },
    ).format(date);
}

function formatYear(value: number | string) {
    const date = new Date(value);
    return new Intl.DateTimeFormat(
        'en-US',
        { year: 'numeric' },
    ).format(date);
}

function suffix(num: number, suffixStr: string, skipZero: boolean) {
    if (num === 0) {
        return skipZero ? '' : '0';
    }
    return `${num.toLocaleString()} ${suffixStr}${num !== 1 ? 's' : ''}`;
}

type DurationNumeric = 0 | 1 | 2 | 3 | 4 | 5;

const mappings: {
    [x in DurationNumeric]: {
        text: string;
        shortText: string;
        value: number;
    }
} = {
    0: {
        shortText: 'yr',
        text: 'year',
        value: 365 * 24 * 60 * 60,
    },
    1: {
        shortText: 'mo',
        text: 'month',
        value: 30 * 24 * 60 * 60,
    },
    2: {
        shortText: 'day',
        text: 'day',
        value: 24 * 60 * 60,
    },
    3: {
        shortText: 'hr',
        text: 'hour',
        value: 60 * 60,
    },
    4: {
        shortText: 'min',
        text: 'minute',
        value: 60,
    },
    5: {
        shortText: 'sec',
        text: 'second',
        value: 1,
    },
};

function formatTimeDuration(
    seconds: number,
    separator = ' ',
    shorten = false,
    stop = 2,
    startFrom: DurationNumeric = 3,
    endAt?: DurationNumeric,
): string {
    if (endAt === startFrom) {
        return '';
    }
    if (startFrom === 5) {
        return suffix(seconds, shorten ? 'sec' : 'second', false);
    }

    const map = mappings[startFrom];
    const dur = Math.floor(seconds / map.value);
    if (dur >= 1) {
        return [
            suffix(dur, shorten ? map.shortText : map.text, true),
            formatTimeDuration(
                seconds % map.value,
                separator,
                shorten,
                stop,
                startFrom,
                endAt ?? Math.min(startFrom + stop, 5) as DurationNumeric,
            ),
        ].filter(Boolean).join(' ');
    }

    const nextStartFrom: DurationNumeric = (startFrom + 1) as DurationNumeric;
    return formatTimeDuration(
        seconds,
        separator,
        shorten,
        stop,
        nextStartFrom,
        endAt,
    );
}

/*
function formatTimeDuration(value: number) {
    return formatDuration(intervalToDuration({ start: 0, end: value * 60000 }));
}
*/

// Swipes by mission

function projectTypeFormatter(value: string) {
    return projectTypes[value].name;
}

const projectTypeTotalSwipeFormatter = (value: number, name: string) => (
    [value.toLocaleString(), projectTypeFormatter(name)]
);

// Swipes by organization

function organizationNameFormatter(value: string) {
    return value || 'Unknown';
}

const organizationTotalSwipeFormatter = (value: number, name: string) => (
    [value.toLocaleString(), organizationNameFormatter(name)]
);

// Timeseries by week day

interface Day {
    key: string;
    title: string;
}
const days: Day[] = [
    {
        key: '0',
        title: 'Sunday',
    },
    {
        key: '1',
        title: 'Monday',
    },
    {
        key: '2',
        title: 'Tuesday',
    },
    {
        key: '3',
        title: 'Wednesday',
    },
    {
        key: '4',
        title: 'Thursday',
    },
    {
        key: '5',
        title: 'Friday',
    },
    {
        key: '6',
        title: 'Saturday',
    },
];

// Timeseries

function timeSpentLabelFormatter(value: number) {
    if (value) {
        return [formatTimeDuration(value), 'Total time'];
    }
    return [value, 'Total time'];
}

interface Props{
    className?: string;
    heading?: string;
    contributionTimeStats: ContributorTimeType[] | null | undefined;
    projectTypeStats: ProjectTypeStats[] | null | undefined;
    organizationTypeStats: OrganizationTypeStats[] | null | undefined;
    projectSwipeTypeStats: ProjectSwipeTypeStats[] | null | undefined;
    contributions: MapContributionType[] | undefined | null;
}

function StatsBoard(props: Props) {
    const {
        className,
        heading,
        contributionTimeStats,
        projectTypeStats,
        organizationTypeStats,
        projectSwipeTypeStats,
        contributions,
    } = props;

    // Timeseries
    // FIXME: update this logic
    const len = (contributionTimeStats ?? []).length;
    let resolution: 'year' | 'month' | 'day';
    if (len > 5 * 365) {
        resolution = 'year';
    } else if (len > 0.5 * 365) {
        resolution = 'month';
    } else {
        resolution = 'day';
    }

    // eslint-disable-next-line no-nested-ternary
    const timeFormatter = resolution === 'day'
        ? formatDate
        : resolution === 'month'
            ? formatMonth
            : formatYear;

    const contributionTimeSeries = useMemo(
        () => {
            const values = (contributionTimeStats ?? [])
                .filter((contribution) => isDefined(contribution.date))
                .map((contribution) => ({
                    date: removeTime(contribution.date, resolution).getTime(),
                    total: contribution.total,
                }))
                .filter((contribution) => contribution.total > 0);

            return mergeItems(
                values,
                (item) => String(item.date),
                (foo, bar) => ({
                    date: foo.date,
                    total: foo.total + bar.total,
                }),
            ).sort((a, b) => (a.date - b.date));
        },
        [contributionTimeStats, resolution],
    );

    const contributionTimeSeriesWithoutGaps = useMemo(
        () => {
            if (!contributionTimeSeries || contributionTimeSeries.length < 2) {
                return undefined;
            }

            const mapping = listToMap(
                contributionTimeSeries,
                (item) => item.date,
                (item) => item.total,
            );

            return getTimestamps(
                contributionTimeSeries[0].date,
                contributionTimeSeries[contributionTimeSeries.length - 1].date,
                resolution,
            )
                .map((item) => ({
                    total: mapping[item] ?? 0,
                    date: item,
                }));
        },
        [contributionTimeSeries, resolution],
    );

    // Timeseries by Day of Week

    const totalContributionByDay = useMemo(() => {
        const dayWiseContribution = listToGroupList(
            contributionTimeSeries,
            (d) => new Date(d.date).getDay(),
            (d) => d.total,
        );

        // NOTE: add emptyContribution so that there is no gap between days
        const emptyContribution = listToMap(
            days,
            (d) => d.key,
            () => [],
        );

        const result = mapToList(
            {
                ...emptyContribution,
                ...dayWiseContribution,
            },
            (d, key) => ({
                // NOTE: this will never be undefined
                day: days.find((day) => (day.key === key))?.title,
                total: sum(d),
            }),
        );

        return result;
    }, [contributionTimeSeries]);

    const totalContribution = useMemo(() => (
        sum(totalContributionByDay.map((contribution) => contribution.total))
    ), [totalContributionByDay]);

    // Swipes by Mission

    const totalSwipes = projectSwipeTypeStats ? sum(
        projectSwipeTypeStats.map((project) => (project.totalSwipe)),
    ) : undefined;

    const sortedProjectSwipeType = useMemo(
        () => (
            projectSwipeTypeStats
                ?.map((item) => ({
                    ...item,
                    projectType: item.projectType ?? '-1',
                }))
                .sort((a, b) => compareNumber(b.totalSwipe, a.totalSwipe)) ?? []
        ),
        [projectSwipeTypeStats],
    );

    // Swipes by Organization

    const totalSwipesByOrganization = organizationTypeStats ? sum(
        organizationTypeStats?.map((organization) => (organization.totalSwipe ?? 0)),
    ) : undefined;

    const totalSwipesByOrganizationStats = useMemo(() => {
        const sortedTotalSwipeByOrganization = organizationTypeStats
            ?.map((item) => ({
                ...item,
                organizationName: item.organizationName ?? 'Unknown',
            }))
            .filter((project) => isDefined(project.organizationName))
            .sort((a, b) => compareNumber(b.totalSwipe, a.totalSwipe)) ?? [];

        if (sortedTotalSwipeByOrganization.length <= 5) {
            return sortedTotalSwipeByOrganization;
        }
        // FIXME: we need to look for one by off error
        return [
            ...sortedTotalSwipeByOrganization.slice(0, 4),
            {
                organizationName: 'Others',
                totalSwipe: sum(
                    sortedTotalSwipeByOrganization
                        .slice(4)
                        .map((item) => item.totalSwipe),
                ),
            },
        ];
    }, [organizationTypeStats]);

    // Others

    const buildAreaTotalArea = projectTypeStats?.find(
        (project) => project.projectType === BUILD_AREA,
    )?.area;
    const changeDetectionTotalSwipes = projectSwipeTypeStats?.find(
        (project) => project.projectType === CHANGE_DETECTION,
    )?.totalSwipe;
    const footPrintTotalSwipes = projectSwipeTypeStats?.find(
        (project) => project.projectType === FOOT_PRINT,
    )?.totalSwipe;

    const organizationColors = scaleOrdinal<string, string | undefined>()
        .domain(totalSwipesByOrganizationStats?.map(
            (organization) => (organization.organizationName),
        ).filter(isDefined) ?? [])
        .range([
            '#f8a769',
            '#ffd982',
            '#bbcb7d',
            '#79aeeb',
            '#8a8c91',
        ]);

    return (
        <div className={_cs(className, styles.statsBoard)}>
            {heading && (
                <Heading size="large">
                    {heading}
                </Heading>
            )}
            <div className={styles.board}>
                <StatsContainer
                    title="Contribution Heatmap"
                >
                    <ContributionHeatmap
                        contributions={contributions}
                    />
                </StatsContainer>
                <StatsContainer
                    title="Time Spent Contributing"
                    contentClassName={styles.timeSpentChartContainer}
                >
                    {/* eslint-disable-next-line max-len */}
                    {contributionTimeSeriesWithoutGaps && contributionTimeSeriesWithoutGaps.length >= 2 && (
                        <ResponsiveContainer>
                            <AreaChart
                                data={contributionTimeSeriesWithoutGaps}
                                margin={{
                                    top: 0,
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                }}
                            >
                                <defs>
                                    <linearGradient id="stat" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-primary-light)" stopOpacity={0.6} />
                                        <stop offset="95%" stopColor="var(--color-primary-light)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="date"
                                    type="number"
                                    scale="time"
                                    domain={['dataMin', 'dataMax']}
                                    allowDuplicatedCategory={false}
                                    tick={{ strokeWidth: 1 }}
                                    tickFormatter={timeFormatter}
                                    minTickGap={20}
                                    // ticks={ticks}
                                    interval="preserveStartEnd"
                                    padding={{ left: 10, right: 30 }}
                                />
                                <YAxis
                                    type="number"
                                    dataKey="total"
                                    tickFormatter={(value) => formatTimeDuration(value, ' ', true)}
                                    // domain={[0.9, 'auto']}
                                    padding={{ top: 20, bottom: 5 }}
                                    width={100}
                                />
                                <Tooltip
                                    labelFormatter={timeFormatter}
                                    formatter={timeSpentLabelFormatter}
                                />
                                <Area
                                    // type="step"
                                    type="linear"
                                    // type="monotoneX"
                                    // type="natural"
                                    dataKey="total"
                                    stroke="var(--color-primary-light)"
                                    fillOpacity={1}
                                    fill="url(#stat)"
                                    strokeWidth={2}
                                    connectNulls
                                    activeDot
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </StatsContainer>
                <InformationCard
                    label="Time Spent Contributing by Day of Week"
                    value={isDefined(totalContribution) && totalContribution > 0 && (
                        <TextOutput
                            className={styles.numberOutput}
                            value={formatTimeDuration(totalContribution)}
                        />
                    )}
                    variant="stat"
                    contentClassName={styles.timeSpentChartContainer}
                >
                    {totalContributionByDay && (
                        <ResponsiveContainer>
                            <BarChart data={totalContributionByDay}>
                                <Tooltip formatter={timeSpentLabelFormatter} />
                                <XAxis dataKey="day" />
                                <YAxis
                                    tickFormatter={(value) => formatTimeDuration(value, ' ', true)}
                                    padding={{ top: 20, bottom: 0 }}
                                    width={100}
                                />
                                <Bar
                                    dataKey="total"
                                    fill="var(--color-primary-light)"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </InformationCard>
                <div className={styles.statsCardContainer}>
                    <InformationCard
                        icon={(<img src={areaSvg} alt="user icon" />)}
                        value={(
                            <NumberOutput
                                className={styles.numberOutput}
                                value={buildAreaTotalArea}
                                normal
                            />
                        )}
                        label="Area Reviewed (in sq km)"
                        subHeading="Build Area"
                        variant="stat"
                    />
                    <InformationCard
                        icon={(<img src={featureSvg} alt="group icon" />)}
                        value={(
                            <NumberOutput
                                className={styles.numberOutput}
                                value={footPrintTotalSwipes}
                                normal
                            />
                        )}
                        label="Features Checked (# of swipes)"
                        subHeading="Footprint"
                        variant="stat"
                    />
                    <InformationCard
                        icon={(<img src={sceneSvg} alt="swipe icon" />)}
                        value={(
                            <NumberOutput
                                className={styles.numberOutput}
                                value={changeDetectionTotalSwipes}
                                normal
                            />
                        )}
                        label="Scene Comparision (# of swipes)"
                        subHeading="Change Detection"
                        variant="stat"
                    />
                </div>
                <div className={styles.otherStatsContainer}>
                    <InformationCard
                        value={(
                            <NumberOutput
                                className={styles.numberOutput}
                                value={totalSwipes}
                                normal
                            />
                        )}
                        label="Swipes by Mission Type"
                        variant="stat"
                        contentClassName={styles.pieChartContainer}
                    >
                        <ResponsiveContainer>
                            <PieChart>
                                <Tooltip formatter={projectTypeTotalSwipeFormatter} />
                                <Legend
                                    align="right"
                                    layout="vertical"
                                    verticalAlign="middle"
                                    formatter={projectTypeFormatter}
                                    iconType="circle"
                                />
                                <Pie
                                    data={sortedProjectSwipeType}
                                    dataKey="totalSwipe"
                                    nameKey="projectType"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius="90%"
                                    innerRadius="50%"
                                >
                                    {sortedProjectSwipeType.map((item) => (
                                        <Cell
                                            key={item.projectType}
                                            fill={projectTypes[item.projectType].color}
                                        />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </InformationCard>
                    <InformationCard
                        value={(
                            <NumberOutput
                                className={styles.numberOutput}
                                value={totalSwipesByOrganization}
                                normal
                            />
                        )}
                        label="Swipes by Organization"
                        variant="stat"
                        contentClassName={styles.pieChartContainer}
                    >
                        <ResponsiveContainer>
                            <PieChart>
                                <Tooltip formatter={organizationTotalSwipeFormatter} />
                                <Legend
                                    align="right"
                                    layout="vertical"
                                    verticalAlign="middle"
                                    formatter={organizationNameFormatter}
                                    iconType="circle"
                                />
                                <Pie
                                    data={totalSwipesByOrganizationStats ?? undefined}
                                    dataKey="totalSwipe"
                                    nameKey="organizationName"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius="90%"
                                    innerRadius="50%"
                                >
                                    {totalSwipesByOrganizationStats?.map((item) => (
                                        <Cell
                                            key={item.organizationName}
                                            fill={item.organizationName
                                                ? organizationColors(item.organizationName) ?? '#808080'
                                                : '#808080'}
                                        />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </InformationCard>
                </div>
            </div>
        </div>
    );
}

export default StatsBoard;
