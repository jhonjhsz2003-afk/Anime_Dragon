// Optional discovery rails must not hold the main catalog behind a slow service.
// A timed-out task can still populate the normal catalog cache in the background.
export async function withinCatalogBudget(task, milliseconds, fallback, background) {
  const work = Promise.resolve(task).catch(() => fallback);
  if (background) background(work);
  let timer;
  try {
    return await Promise.race([
      work,
      new Promise(resolve => { timer = setTimeout(() => resolve(fallback), milliseconds); })
    ]);
  } finally {
    clearTimeout(timer);
  }
}
