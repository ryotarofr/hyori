import { useState } from "react";

import { Button } from "@/components/ui/Button";

import type { Meta, StoryObj } from "@storybook/react";

import { Modal } from ".";

const meta: Meta<typeof Modal> = {
  component: Modal,
  decorators: [
    (Story, { args }) => {
      const [opened, setOpened] = useState(false);
      return (
        <>
          <div>
            <Button
              data-testid="openButton"
              onClick={() => setOpened(true)}
              style={{
                pointerEvents: "auto",
              }}
            >
              Open modal.
            </Button>
          </div>
          <Story
            args={{
              ...args,
              opened: opened,
              setOpened: setOpened,
            }}
          />
        </>
      );
    },
  ],
  args: {
    title: "もーだるてすと",
    children: <p id="test-child">Inner content.</p>,
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

export const Default: Story = {
};

export const Scrollable: Story = {
  args: {
    children: (
      <div
        data-testid="scrollableContent"
        style={{
          overflow: "auto",
          width: "10em",
          height: "10em",
        }}
      >
        scrollable
        <div
          style={{
            width: "100em",
            height: "100em",
          }}
        />
      </div>
    ),
  },
};

export const TooLongContent: Story = {
  args: {
    children: (
      [...Array(100)].map((_, index) =>
        <p key={index}>{index}</p>,
      )
    ),
  },
};
