import { composeStories } from "@storybook/react";
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import styles from "./Modal.module.scss";
import * as stories from "./Modal.stories";

const story = composeStories(stories);

describe("<Modal />", () => {
  const getRendered
    = () =>
      render(
        <story.Default />,
      ).container.firstChild as HTMLElement;

  it("描画可能", async () => {
    const rendered = getRendered();
    expect(rendered).toBeInTheDocument();
  });
  it("CSS-Module class を持つ", async () => {
    getRendered();
    expect(document.querySelector("dialog")?.classList.contains(styles.Modal)).toBe(true);
  });
  it("子要素が描画されている", async () => {
    const rendered = getRendered();
    expect(rendered.firstChild).not.toBeUndefined();
    expect(document.querySelector("dialog")?.querySelector("p#test-child")).toBeInTheDocument();
  });

  // it("内部コンテンツがスクロール可能", async () => {
  //   render(<story.Scrollable />);
  //   const openButton = (await screen.findByTestId("openButton")) as HTMLButtonElement;

  //   const user = userEvent.setup();
  //   await user.click(openButton);

  //   const scrollableContent = (await screen.findByTestId("scrollableContent"));
  //   const beforeScroll = scrollableContent.scrollTop;

  //   // await user.scroll() が無いため実施不可

  //   const afterScroll = scrollableContent.scrollTop;
  //   expect(beforeScroll).not.toBe(afterScroll);
  // });
});
