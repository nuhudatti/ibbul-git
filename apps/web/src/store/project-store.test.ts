import assert from "node:assert/strict";
import test from "node:test";
import { waitForHydrationState } from "./project-store.ts";

test("waitForHydrationState resolves immediately when already hydrated", async () => {
  let resolved = false;
  await waitForHydrationState(() => true, () => {
    resolved = true;
  });
  assert.equal(resolved, false);
});

test("waitForHydrationState resolves after hydration finishes", async () => {
  let callback: (() => void) | undefined;
  const promise = waitForHydrationState(
    () => false,
    (cb) => {
      callback = cb;
      return () => undefined;
    }
  );

  assert.equal(typeof callback, "function");
  callback?.();
  await promise;
  assert.equal(true, true);
});
