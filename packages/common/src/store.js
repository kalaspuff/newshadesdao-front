import React from "react";
import { create as createZustandStoreHook } from "zustand";
import { useAuth, useAuthListener } from "./auth.js";
import { useStore as useCacheStore } from "./cache-store.js";
import rootReducer from "./root-reducer.js";
import createActions from "./actions.js";
import { mapValues } from "./utils/object.js";
import { parseString as parseStringToMessageBlocks } from "./utils/message.js";
import { selectMe } from "./reducers/me.js";
import {
  selectUser,
  selectIsUserStarred,
  selectIsUserBlocked,
  selectUserFromWalletAddress,
} from "./reducers/users.js";
import {
  selectChannel,
  selectChannelName,
  selectChannelAccessLevel,
  selectStarredChannels,
  selectDmChannelFromUserId,
  selectDmChannelWithMember,
  selectChannelHasUnread,
} from "./reducers/channels.js";
import { selectMessage } from "./reducers/messages.js";
import { selectEnsName } from "./reducers/ens.js";
import { selectHasFetchedUserChannels } from "./reducers/ui.js";
import useLatestCallback from "./react/hooks/latest-callback.js";

const isTruncatedAddress = (s) =>
  typeof s === "string" && s.startsWith("0x") && s.includes("...");

const selectorFunctions = {
  selectMe,
  selectUser,
  selectUserFromWalletAddress,
  selectMessage,
  selectEnsName,
  selectDmChannelFromUserId,
  selectDmChannelWithMember,
  selectChannel,
  selectChannelName,
  selectStarredChannels,
  selectChannelAccessLevel,
  selectChannelHasUnread,
  selectIsUserStarred,
  selectIsUserBlocked,
  selectHasFetchedUserChannels,
};

const useZustandStore = createZustandStoreHook((setState) => {
  const initialState = rootReducer(undefined, {});
  return {
    ...initialState,
    dispatch: (action) => setState((state) => rootReducer(state, action)),
  };
});

export const useStore = (...args) => useZustandStore(...args);

const getStoreState = useZustandStore.getState;

const beforeActionListeners = new Set();
const afterActionListeners = new Set();

const useActionDispatcher = () => {
  const dispatch_ = useZustandStore((s) => s.dispatch);

  const dispatch = React.useCallback(
    (action) => {
      for (let listener of beforeActionListeners) listener(action);
      const result = dispatch_(action);
      for (let listener of afterActionListeners) listener(action);
      return result;
    },
    [dispatch_]
  );

  return dispatch;
};

export const useBeforeActionListener = (listener_) => {
  const listener = useLatestCallback(listener_);

  React.useEffect(() => {
    beforeActionListeners.add(listener);
    return () => {
      beforeActionListeners.delete(listener);
    };
  }, [listener]);
};

export const useAfterActionListener = (listener_) => {
  const listener = useLatestCallback(listener_);

  React.useEffect(() => {
    afterActionListeners.add(listener);
    return () => {
      afterActionListeners.delete(listener);
    };
  }, [listener]);
};

const createApiParsers = ({ buildCloudflareImageUrl }) => ({
  parseUser(u) {
    if (u.id == null) throw new Error();

    const normalizeString = (maybeString) => {
      if (maybeString == null || maybeString.trim() === "") return null;
      return maybeString.trim();
    };

    const createProfilePicture = () => {
      if (u.pfp == null) return null;

      if (normalizeString(u.pfp.cf_id) == null)
        return {
          small: u.pfp.input_image_url,
          large: u.pfp.input_image_url,
        };

      return {
        small: buildCloudflareImageUrl(u.pfp.cf_id, { size: "small" }),
        large: buildCloudflareImageUrl(u.pfp.cf_id, { size: "large" }),
        isVerified: u.pfp.verified,
      };
    };

    const parsedData = { id: u.id };

    // Static ish
    if (u.wallet_address != null) parsedData.walletAddress = u.wallet_address;
    if (u.push_tokens != null) parsedData.pushTokens = u.push_tokens;
    if (u.created_at != null) parsedData.createdAt = u.created_at;

    if (u.display_name !== undefined && !isTruncatedAddress(u.display_name))
      parsedData.displayName = normalizeString(u.display_name);

    if (u.description !== undefined)
      parsedData.description = normalizeString(u.description);

    if (u.status !== undefined) parsedData.status = normalizeString(u.status);

    if (u.pfp !== undefined) parsedData.profilePicture = createProfilePicture();

    return parsedData;
  },
  parseChannel(rawChannel) {
    if (rawChannel.id == null) throw new Error();

    const normalizeString = (s) => {
      if (s == null) return null;
      return s.trim() === "" ? null : s;
    };

    const description = normalizeString(rawChannel.description);

    const channel = {
      id: rawChannel.id,
      name: normalizeString(rawChannel.name),
      description,
      descriptionBlocks:
        description == null ? null : parseStringToMessageBlocks(description),
      kind: rawChannel.kind,
      createdAt: rawChannel.created_at,
      lastMessageAt: rawChannel.last_message_at,
      memberUserIds:
        rawChannel.members == null
          ? undefined
          : rawChannel.members.map((m) => (typeof m === "string" ? m : m.user)),
      ownerUserId: rawChannel.owner,
      isDeleted: rawChannel.deleted,
    };

    if (normalizeString(rawChannel.avatar) == null) return channel;

    if (rawChannel.avatar.match(/^https?:\/\//)) {
      const url = rawChannel.avatar;
      return { ...channel, image: url, imageLarge: url };
    }

    const image = buildCloudflareImageUrl(rawChannel.avatar, { size: "small" });
    const imageLarge = buildCloudflareImageUrl(rawChannel.avatar, {
      size: "large",
    });

    return { ...channel, image, imageLarge };
  },
  parseMessage(rawMessage) {
    if (rawMessage.id == null) throw new Error();

    if (rawMessage.deleted) return { id: rawMessage.id, deleted: true };

    const systemMessageTypes = [
      "member-joined",
      "user-invited",
      "channel-updated",
      "app-installed",
    ];

    const appMessageTypes = ["webhook", "app"];

    const deriveMessageType = (message) => {
      switch (message.type) {
        case undefined:
        case 0:
          return "regular";
        case 1:
          if (message.inviter) return "user-invited";
          return "member-joined";
        case 2:
        case 3:
          return "webhook";
        case 5:
          return "channel-updated";
        case 6:
          return "app-installed";
        default:
          console.warn(`Unknown message type "${message.type}"`);
      }
    };

    const type = deriveMessageType(rawMessage);

    const isSystemMessage = systemMessageTypes.includes(type);
    const isAppMessage = appMessageTypes.includes(type);

    const appId = rawMessage.app;
    const authorUserId = rawMessage.author;

    const content =
      rawMessage.blocks?.length > 0
        ? rawMessage.blocks
        : [{ type: "paragraph", children: [{ text: rawMessage.content }] }];

    const authorId = isSystemMessage
      ? "system"
      : isAppMessage
      ? appId
      : authorUserId;

    return {
      id: rawMessage.id,
      deleted: rawMessage.deleted,
      createdAt: rawMessage.created_at,
      channelId: rawMessage.channel,
      authorUserId,
      authorId,
      isEdited: rawMessage.edited_at != null,
      type,
      isSystemMessage,
      isAppMessage,
      installerUserId: rawMessage.installer,
      inviterUserId: rawMessage.inviter,
      content,
      stringContent: rawMessage.content,
      embeds: rawMessage.embeds,
      reactions: rawMessage.reactions,
      appId,
      replyTargetMessageId: rawMessage.reply_to,
      isReply: rawMessage.reply_to != null,
      updates: rawMessage.updates,
    };
  },
});

const Context = React.createContext({});

export const Provider = ({ cloudflareAccountHash, children }) => {
  const {
    status: authStatus,
    authorizedFetch,
    tokenStore: authTokenStore,
  } = useAuth();

  const dispatch = useActionDispatcher();

  const cacheStore = useCacheStore();

  const buildCloudflareImageUrl = React.useCallback(
    (cloudflareId, { size } = {}) => {
      const variantNameBySizeName = { small: "avatar", large: "public" };
      const variant = variantNameBySizeName[size];
      if (variant == null) throw new Error();
      return `https://imagedelivery.net/${cloudflareAccountHash}/${cloudflareId}/${variant}`;
    },
    [cloudflareAccountHash]
  );

  const { parseUser, parseChannel, parseMessage } = createApiParsers({
    buildCloudflareImageUrl,
  });

  const selectors = mapValues(
    (selector) =>
      // eslint-disable-next-line
      useLatestCallback((...args) => selector(getStoreState(), ...args)),
    selectorFunctions
  );

  const actions = mapValues(
    // eslint-disable-next-line
    (actionFn) => useLatestCallback(actionFn),
    createActions({
      dispatch,
      authStatus,
      authorizedFetch,
      getStoreState,
      cacheStore,
      parseUser,
      parseChannel,
      parseMessage,
      buildCloudflareImageUrl,
      authTokenStore,
    })
  );

  useAuthListener((eventName) => {
    if (eventName === "access-token-expired") actions.logout();
  });

  const serverMessageHandler = useLatestCallback((name, data) => {
    const me = selectMe(getStoreState());

    let typingEndedTimeoutHandles = {};

    // Dispatch a 'user-typing-ended' action when a user+channel combo has
    // been silent for a while
    if (name === "user-typed") {
      const id = [data.channel.id, data.user.id].join(":");

      if (typingEndedTimeoutHandles[id]) {
        clearTimeout(typingEndedTimeoutHandles[id]);
        delete typingEndedTimeoutHandles[id];
      }

      typingEndedTimeoutHandles[id] = setTimeout(() => {
        delete typingEndedTimeoutHandles[id];
        dispatch({
          type: "user-typing-ended",
          channelId: data.channel.id,
          userId: data.user.id,
        });
      }, 6000);
    }

    const dispatchEvent = (customData) =>
      dispatch({
        type: ["server-event", name].join(":"),
        data: { ...data, ...customData },
        user: me,
      });

    switch (name) {
      case "channel-updated":
      case "channel-user":
        dispatchEvent({ channel: parseChannel(data.channel) });
        break;

      case "user-profile-updated":
      case "user-presence-updated":
      case "channel-user-joined":
        dispatchEvent({ user: parseUser(data.user) });
        break;

      case "message-created":
      case "message-updated":
      case "message-removed":
      case "message-reaction-added":
      case "message-reaction-removed":
        dispatchEvent({ message: parseMessage(data.message) });
        break;

      case "channel-user-invited":
        dispatchEvent({
          user: parseUser(data.user),
          channel: parseChannel(data.channel),
        });
        break;

      default:
        dispatchEvent();
    }
  });

  const contextValue = React.useMemo(
    () => ({
      selectors,
      actions,
      serverMessageHandler,
    }),
    // eslint-disable-next-line
    [
      // eslint-disable-next-line
      ...Object.values(selectors),
      // eslint-disable-next-line
      ...Object.values(actions),
      serverMessageHandler,
    ]
  );

  return <Context.Provider value={contextValue}>{children}</Context.Provider>;
};

export const useSelectors = () => {
  const { selectors } = React.useContext(Context);
  return selectors;
};

export const useActions = () => {
  const { actions } = React.useContext(Context);
  return actions;
};

export const useServerMessageHandler = () => {
  const { serverMessageHandler } = React.useContext(Context);
  return serverMessageHandler;
};
