import { describe, expect, it } from "vitest";

import { movePhoto, movePhotoToFront } from "@/lib/admin-photo-order";

describe("movePhotoToFront", () => {
  it("moves a middle item to the front, preserving the rest of the order", () => {
    expect(movePhotoToFront(["a", "b", "c"], "b")).toEqual(["b", "a", "c"]);
  });

  it("is a no-op when the item is already first", () => {
    expect(movePhotoToFront(["a", "b", "c"], "a")).toEqual(["a", "b", "c"]);
  });

  it("leaves the list unchanged (as a copy) when the id isn't present", () => {
    expect(movePhotoToFront(["a", "b"], "z")).toEqual(["a", "b"]);
  });
});

describe("movePhoto", () => {
  it("swaps with the previous item when moving up", () => {
    expect(movePhoto(["a", "b", "c"], "b", "up")).toEqual(["b", "a", "c"]);
  });

  it("swaps with the next item when moving down", () => {
    expect(movePhoto(["a", "b", "c"], "b", "down")).toEqual(["a", "c", "b"]);
  });

  it("is a no-op moving the first item up", () => {
    expect(movePhoto(["a", "b", "c"], "a", "up")).toEqual(["a", "b", "c"]);
  });

  it("is a no-op moving the last item down", () => {
    expect(movePhoto(["a", "b", "c"], "c", "down")).toEqual(["a", "b", "c"]);
  });

  it("is a no-op when the id isn't present", () => {
    expect(movePhoto(["a", "b", "c"], "z", "up")).toEqual(["a", "b", "c"]);
  });
});
