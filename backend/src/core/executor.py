"""Shared executor for CPU-bound engine calls.

The spec calls for a ProcessPoolExecutor; a ThreadPoolExecutor is used here
because the engine singletons (and optional loaded ML models) are not trivially
picklable across processes, and RDKit/NumPy release the GIL for the heavy work.
Swap to ProcessPoolExecutor with a worker initializer if CPU saturation demands.
"""

from __future__ import annotations

import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Callable, TypeVar

T = TypeVar("T")

_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="engine")


async def run_cpu_bound(fn: Callable[..., T], *args) -> T:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, fn, *args)
