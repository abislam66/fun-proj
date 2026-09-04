"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { updateOwnProfile } from "@/actions/account";
import { Button, Input } from "@/components/ui/primitives";
import { YearPicker } from "@/components/ui/year-picker";
import {
  MAX_DISPLAY_NAME_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_DISPLAY_NAME_LENGTH,
  MIN_USERNAME_LENGTH,
} from "@/config/site";

export function AccountProfileForm({
  displayName,
  username,
  graduationYear,
}: {
  displayName: string;
  username: string;
  graduationYear: number | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function save(formData: FormData) {
    const yearRaw = String(formData.get("graduationYear") ?? "");
    const year = yearRaw === "" ? null : Number(yearRaw);

    setPending(true);
    setError(null);
    setNotice(null);
    const result = await updateOwnProfile({
      displayName: String(formData.get("displayName") ?? ""),
      username: String(formData.get("username") ?? ""),
      graduationYear: Number.isFinite(year) ? year : null,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice("Saved.");
    router.refresh();
  }

  return (
    <form
      className="account-profile-form"
      onSubmit={(event) => {
        event.preventDefault();
        void save(new FormData(event.currentTarget));
      }}
    >
      <label>
        <span>Name</span>
        <Input
          autoComplete="nickname"
          defaultValue={displayName}
          maxLength={MAX_DISPLAY_NAME_LENGTH}
          minLength={MIN_DISPLAY_NAME_LENGTH}
          name="displayName"
          required
        />
      </label>
      <label>
        <span>Username</span>
        <span className="account-username-field">
          <span aria-hidden="true">@</span>
          <Input
            autoComplete="username"
            defaultValue={username}
            maxLength={MAX_USERNAME_LENGTH}
            minLength={MIN_USERNAME_LENGTH}
            name="username"
            pattern="[a-z][a-z0-9_]{2,19}"
            required
            spellCheck={false}
          />
        </span>
      </label>
      <fieldset className="account-year-field">
        <legend>Class year</legend>
        <YearPicker name="graduationYear" value={graduationYear} />
      </fieldset>
      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="form-notice">{notice}</p> : null}
      <Button disabled={pending} type="submit">
        Save profile
      </Button>
    </form>
  );
}
