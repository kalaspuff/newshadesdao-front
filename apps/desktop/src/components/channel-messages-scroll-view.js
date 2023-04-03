import React from "react";
import { css } from "@emotion/react";
import {
  useActions,
  useMe,
  useChannel,
  useChannelHasUnread,
  useChannelAccessLevel,
  useSortedChannelMessageIds,
  useHasAllChannelMessages,
  useHasFetchedChannelMessages,
} from "@shades/common/app";
import { ethereum as ethereumUtils } from "@shades/common/utils";
import useGlobalMediaQueries from "../hooks/global-media-queries.js";
import useIsOnScreen from "../hooks/is-on-screen.js";
import useScrollListener from "../hooks/scroll-listener.js";
import ChannelPrologue from "./channel-prologue.js";
import ChannelMessage from "./channel-message.js";
import ChannelAvatar from "./channel-avatar.js";
import InlineUserButtonWithProfilePopover from "./inline-user-button-with-profile-popover.js";
import FormattedDate from "./formatted-date.js";

const { truncateAddress } = ethereumUtils;

const scrollPositionCache = {};

const useScroll = ({
  cacheKey,
  scrollContainerRef,
  didScrollToBottomRef,
  onScrollToBottom,
}) => {
  const scrollToBottom = React.useCallback(
    (options) => {
      const isScrollable =
        scrollContainerRef.current.scrollHeight >
        scrollContainerRef.current.getBoundingClientRect().height;

      if (!isScrollable) {
        didScrollToBottomRef.current = true;
        return;
      }

      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        ...options,
      });
    },
    [scrollContainerRef, didScrollToBottomRef]
  );

  // Restore cached scroll position
  React.useEffect(() => {
    const { scrollTop: cachedScrollTop } = scrollPositionCache[cacheKey] ?? {};

    if (cachedScrollTop == null) {
      scrollToBottom();
      return;
    }

    const el = scrollContainerRef.current;

    el.scrollTop = cachedScrollTop;

    const isAtBottom =
      Math.ceil(cachedScrollTop) + el.getBoundingClientRect().height >=
      el.scrollHeight;

    didScrollToBottomRef.current = isAtBottom;
  }, [scrollContainerRef, didScrollToBottomRef, cacheKey, scrollToBottom]);

  useScrollListener(scrollContainerRef, (e) => {
    const isAtBottom =
      Math.ceil(e.target.scrollTop) + e.target.getBoundingClientRect().height >=
      e.target.scrollHeight;

    if (isAtBottom) {
      delete scrollPositionCache[cacheKey];
      onScrollToBottom?.();
    } else {
      scrollPositionCache[cacheKey] = { scrollTop: e.target.scrollTop };
    }

    didScrollToBottomRef.current = isAtBottom;
  });

  return { scrollToBottom };
};

const ChannelMessagesScrollView = ({
  channelId,
  compact,
  fetchMessages,
  initReply,
  scrollContainerRef,
  didScrollToBottomRef,
  replyTargetMessageId,
  pendingMessagesBeforeCount,
}) => {
  const messagesContainerRef = React.useRef();

  const { markChannelRead } = useActions();
  const user = useMe();
  const channel = useChannel(channelId, { name: true });
  const messageIds = useSortedChannelMessageIds(channelId);
  const hasAllMessages = useHasAllChannelMessages(channelId);
  const channelHasUnread = useChannelHasUnread(channelId);
  const hasFetchedChannelMessagesAtLeastOnce =
    useHasFetchedChannelMessages(channelId);

  const isAdmin = user != null && user.id === channel.ownerUserId;

  const { inputDeviceCanHover } = useGlobalMediaQueries();
  const [touchFocusedMessageId, setTouchFocusedMessageId] =
    React.useState(null);

  const [averageMessageListItemHeight, setAverageMessageListItemHeight] =
    React.useState(0);

  React.useEffect(() => {
    if (messageIds.length === 0) return;
    // Keep track of the average message height, so that we can make educated
    // guesses at what the placeholder height should be when fetching messages
    setAverageMessageListItemHeight(
      messagesContainerRef.current.scrollHeight / messageIds.length
    );
  }, [messageIds.length]);

  useScrollListener(scrollContainerRef, () => {
    // Bounce back when scrolling to the top of the "loading" placeholder. Makes
    // it feel like you keep scrolling like normal (ish).
    if (scrollContainerRef.current.scrollTop < 10 && pendingMessagesBeforeCount)
      scrollContainerRef.current.scrollTop =
        pendingMessagesBeforeCount * averageMessageListItemHeight -
        scrollContainerRef.current.getBoundingClientRect().height;
  });

  // Fetch new messages as the user scrolls up
  useScrollListener(scrollContainerRef, (e, { direction }) => {
    if (
      // We only care about upward scroll
      direction !== "up" ||
      // Wait until we have fetched the initial batch of messages
      messageIds.length === 0 ||
      // No need to react if we’ve already fetched the full message history
      hasAllMessages ||
      // Wait for any pending fetch requests to finish before we fetch again
      pendingMessagesBeforeCount !== 0
    )
      return;

    const isCloseToTop =
      // ~4 viewport heights from top
      e.target.scrollTop < e.target.getBoundingClientRect().height * 4;

    if (!isCloseToTop) return;

    fetchMessages({ beforeMessageId: messageIds[0], limit: 30 });
  });

  const { scrollToBottom } = useScroll({
    scrollContainerRef,
    didScrollToBottomRef,
    cacheKey: channelId,
    onScrollToBottom: () => {
      if (
        // Only mark as read when the page has focus
        document.hasFocus() &&
        // Wait until the initial message batch is fetched
        hasFetchedChannelMessagesAtLeastOnce &&
        // Don’t bother if the channel is already marked as read
        channelHasUnread
      ) {
        markChannelRead(channelId);
      }
    },
  });

  const lastMessageId = messageIds.slice(-1)[0];

  // Keep scroll at bottom when new messages arrive
  React.useEffect(() => {
    if (lastMessageId == null || !didScrollToBottomRef.current) return;
    scrollToBottom();
  }, [lastMessageId, scrollToBottom, didScrollToBottomRef]);

  return (
    <div
      css={css({
        position: "relative",
        flex: 1,
        display: "flex",
        minHeight: 0,
        minWidth: 0,
      })}
    >
      <div
        ref={scrollContainerRef}
        css={css({
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflowY: "scroll",
          overflowX: "hidden",
          minHeight: 0,
          flex: 1,
          overflowAnchor: "none",
        })}
      >
        <div
          css={css({
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            alignItems: "stretch",
            minHeight: "100%",
          })}
        >
          {hasAllMessages && <ChannelIntro channelId={channelId} />}

          {!hasAllMessages && messageIds.length > 0 && (
            <OnScreenTrigger
              callback={() => {
                // This should only happen on huge viewports where all messages from the
                // initial fetch fit in view without a scrollbar. All other cases should be
                // covered by the scroll listener
                fetchMessages({ beforeMessageId: messageIds[0], limit: 30 });
              }}
            />
          )}

          {pendingMessagesBeforeCount > 0 && (
            <div
              style={{
                height: `${
                  pendingMessagesBeforeCount * averageMessageListItemHeight
                }px`,
              }}
            />
          )}

          <div
            ref={messagesContainerRef}
            role="list"
            css={(theme) =>
              css({
                minHeight: 0,
                fontSize: theme.fontSizes.channelMessages,
                fontWeight: "400",
              })
            }
          >
            {messageIds.map((messageId, i, messageIds) => (
              <ChannelMessage
                key={messageId}
                channelId={channelId}
                messageId={messageId}
                previousMessageId={messageIds[i - 1]}
                hasPendingReply={replyTargetMessageId === messageId}
                initReply={initReply}
                isAdmin={isAdmin}
                hasTouchFocus={touchFocusedMessageId === messageId}
                giveTouchFocus={
                  inputDeviceCanHover ? undefined : setTouchFocusedMessageId
                }
                compact={compact}
              />
            ))}
            <div css={css({ height: "1.6rem" })} />
          </div>
        </div>
      </div>
    </div>
  );
};

const ChannelIntro = ({ channelId }) => {
  const me = useMe();
  const channel = useChannel(channelId, { name: true, members: true });
  const channelAccessLevel = useChannelAccessLevel(channelId);
  const messageIds = useSortedChannelMessageIds(channelId);

  const isAdmin = me != null && me.id === channel.ownerUserId;
  const hasMembers = channel.memberUserIds.length > 1;

  const buildBody = () => {
    if (channel.kind === "dm") {
      return (
        <>
          This conversation is just between{" "}
          {channel.members
            .filter(
              (m) =>
                me == null ||
                m.walletAddress.toLowerCase() !== me.walletAddress.toLowerCase()
            )
            .map((m, i, ms) => {
              return (
                <React.Fragment key={m.walletAddress}>
                  <InlineUserButtonWithProfilePopover userId={m.id} />
                  {i !== ms.length - 1 ? ", " : null}
                </React.Fragment>
              );
            })}{" "}
          and you.
        </>
      );
    }

    if (channel.description != null)
      return (
        <>
          {channel.description.split(/^\s*$/m).map((s) => (
            <p key={s}>{s.trim()}</p>
          ))}
        </>
      );

    return (
      <>
        This is the very beginning of <strong>{channel.name}</strong>.
      </>
    );
  };

  const buildInfo = () => {
    if (channel.kind !== "topic" || hasMembers) return null;

    if (channelAccessLevel === "open")
      return "This channel is open for anyone to join. Share its URL to help people find it!";

    if (isAdmin)
      return <>Add members with the &ldquo;/add-member&rdquo; command.</>;

    return null;
  };

  if (channel == null || (channel.kind === "dm" && me == null)) return null;

  if (channel.kind === "dm" && channel.memberUserIds.length === 2)
    return <DMChannelIntro channelId={channelId} />;

  return (
    <ChannelPrologue
      title={channel.name}
      subtitle={
        <>
          Created by{" "}
          <InlineUserButtonWithProfilePopover userId={channel.ownerUserId} /> on{" "}
          <FormattedDate value={channel.createdAt} day="numeric" month="long" />
        </>
      }
      image={<ChannelAvatar id={channelId} highRes size="6.6rem" />}
      body={buildBody()}
      info={buildInfo()}
      style={{ paddingBottom: messageIds.length === 0 ? 0 : "1rem" }}
    />
  );
};

const DMChannelIntro = ({ channelId }) => {
  const me = useMe();
  const channel = useChannel(channelId, { name: true, members: true });
  const members = channel.members.filter((m) => me != null && me.id !== m.id);
  const truncatedMemberAddress =
    members[0]?.walletAddress == null
      ? null
      : truncateAddress(members[0].walletAddress);

  return (
    <ChannelPrologue
      image={<ChannelAvatar id={channelId} size="6.6rem" />}
      title={channel.name}
      subtitle={
        channel.name.toLowerCase() === truncatedMemberAddress.toLowerCase()
          ? null
          : truncatedMemberAddress
      }
      body={
        <>
          This conversation is just between{" "}
          {members.map((m, i, ms) => (
            <React.Fragment key={m.id}>
              <InlineUserButtonWithProfilePopover userId={m.id} />
              {i !== ms.length - 1 && `, `}
            </React.Fragment>
          ))}{" "}
          and you.
        </>
      }
    />
  );
};

const OnScreenTrigger = ({ callback }) => {
  const ref = React.useRef();
  const callbackRef = React.useRef(callback);

  const isOnScreen = useIsOnScreen(ref);

  React.useEffect(() => {
    callbackRef.current = callback;
  });

  React.useEffect(() => {
    if (isOnScreen) callbackRef.current();
  }, [isOnScreen]);

  return <div ref={ref} />;
};

export default ChannelMessagesScrollView;