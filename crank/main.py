"""RugRoulette crank runner — schedules market creation and resolution cycles."""

import asyncio
import signal
import sys

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from config import SCAN_INTERVAL_MINUTES, RESOLVE_CHECK_INTERVAL_MINUTES, get_logger
from market_creator import create_markets
from market_resolver import resolve_markets

log = get_logger('crank')


def setup_scheduler() -> AsyncIOScheduler:
    """Configure APScheduler with both crank jobs."""
    scheduler = AsyncIOScheduler()

    scheduler.add_job(
        create_markets,
        IntervalTrigger(minutes=SCAN_INTERVAL_MINUTES),
        id="market_creator",
        name="Token Scanner + Market Creator",
        max_instances=1,
        replace_existing=True,
    )

    scheduler.add_job(
        resolve_markets,
        IntervalTrigger(minutes=RESOLVE_CHECK_INTERVAL_MINUTES),
        id="market_resolver",
        name="Market Resolver",
        max_instances=1,
        replace_existing=True,
    )

    return scheduler


async def run_initial_cycle():
    """Run both cranks once on startup before scheduler takes over."""
    log.info("--- initial scan cycle ---")
    await create_markets()
    log.info("--- initial resolve cycle ---")
    await resolve_markets()
    log.info("--- scheduler active ---")


def main():
    scheduler = setup_scheduler()
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    def shutdown(sig_num, frame):
        log.info("shutting down crank (signal %s)...", sig_num)
        scheduler.shutdown(wait=False)
        loop.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    scheduler.start()
    log.info(
        "crank running | scan: %dm | resolve: %dm",
        SCAN_INTERVAL_MINUTES, RESOLVE_CHECK_INTERVAL_MINUTES
    )

    loop.run_until_complete(run_initial_cycle())

    try:
        loop.run_forever()
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown(wait=False)


if __name__ == "__main__":
    main()
