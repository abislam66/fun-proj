"use client";

function join(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function StarRating({
  value,
  onChange,
  readOnly = false,
  name,
}: {
  value: number;
  onChange?: (stars: number) => void;
  readOnly?: boolean;
  name?: string;
}) {
  return (
    <div
      className={join("star-rating", readOnly && "star-rating-readonly")}
      role={readOnly ? "img" : "radiogroup"}
      aria-label={readOnly ? `${value} out of 5 stars` : "Star rating"}
    >
      {[1, 2, 3, 4, 5].map((stars) => {
        const selected = stars <= value;
        if (readOnly) {
          return (
            <span
              aria-hidden="true"
              className={join("star", selected && "is-on")}
              key={stars}
            >
              ★
            </span>
          );
        }
        return (
          <button
            aria-checked={value === stars}
            className={join("star", selected && "is-on")}
            key={stars}
            name={name}
            onClick={() => onChange?.(stars)}
            role="radio"
            type="button"
          >
            <span className="sr-only">{stars} star{stars === 1 ? "" : "s"}</span>
            <span aria-hidden="true">★</span>
          </button>
        );
      })}
    </div>
  );
}
