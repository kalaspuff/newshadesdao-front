import { utils as ethersUtils } from "ethers";
import React from "react";
import { useNavigate } from "react-router";
import { css, useTheme } from "@emotion/react";
import { useEnsAddress } from "wagmi";
import {
  useListBox,
  useListBoxSection,
  useOption,
  useKeyboard,
  mergeProps,
} from "react-aria";
import {
  useActions,
  useMe,
  useUsers,
  useAllUsers,
  useMemberChannels,
  useUserWithWalletAddress,
  useChannel,
  useChannelName,
  useDmChannelWithMember,
} from "@shades/common/app";
import {
  user as userUtils,
  channel as channelUtils,
  ethereum as ethereumUtils,
  array as arrayUtils,
} from "@shades/common/utils";
import { useState as useSidebarState } from "@shades/ui-web/sidebar-layout";
import {
  CrossSmall as CrossSmallIcon,
  Checkmark as CheckmarkIcon,
} from "@shades/ui-web/icons";
import IconButton from "@shades/ui-web/icon-button";
import Combobox, {
  Item as ComboboxItem,
  Section as ComboboxSection,
} from "./combobox";
import { Grid as FlexGrid, Item as FlexGridItem } from "./flex-grid.js";
import ChannelHeader from "./channel-header.js";
import UserAvatar from "./user-avatar.js";
import ChannelAvatar from "./channel-avatar.js";
import NewChannelMessageInput from "./new-channel-message-input.js";

const {
  search: searchUsers,
  createDefaultComparator: createDefaultUserComparator,
} = userUtils;
const {
  search: searchChannels,
  createDefaultComparator: createDefaultChannelComparator,
} = channelUtils;
const { truncateAddress } = ethereumUtils;
const { sort } = arrayUtils;

const getKeyItemType = (key) => {
  if (key == null) return null;
  const [type] = key.split("-");
  return type;
};

const getKeyItemIdentifier = (key) => {
  const type = getKeyItemType(key);
  if (type == null) return null;
  return key.slice(type.length + 1);
};

const useFilteredAccounts = (query) => {
  const me = useMe();
  const users = useAllUsers();

  const { data: ensMatchWalletAddress } = useEnsAddress({
    name: query,
    enabled: /^.+\.eth$/.test(query),
  });

  const filteredOptions = React.useMemo(() => {
    const filteredUsers =
      query.length <= 0
        ? sort(createDefaultUserComparator(), users)
        : searchUsers(users, query);

    const queryUser = ethersUtils.isAddress(query)
      ? { walletAddress: query }
      : ensMatchWalletAddress != null
      ? {
          walletAddress: ensMatchWalletAddress,
          displayName: query,
        }
      : null;

    const includeEnsAccount =
      queryUser != null &&
      !filteredUsers.some(
        (u) =>
          u.walletAddress.toLowerCase() ===
          queryUser.walletAddress.toLowerCase()
      );

    const filteredUsersIncludingEnsMatch = includeEnsAccount
      ? [queryUser, ...filteredOptions]
      : filteredUsers;

    return filteredUsersIncludingEnsMatch.filter(
      (u) => u.walletAddress.toLowerCase() !== me.walletAddress.toLowerCase()
    );
  }, [me, users, query, ensMatchWalletAddress]);

  return filteredOptions;
};

const useFilteredChannels = (query, { selectedWalletAddresses }) => {
  const channels = useMemberChannels({ name: true, members: true });

  const selectedWalletAddressesQuery = selectedWalletAddresses.join(" ");

  const filteredChannels = React.useMemo(() => {
    const filteredChannels =
      query.length <= 0
        ? selectedWalletAddressesQuery.length === 0
          ? sort(createDefaultChannelComparator(), channels)
          : searchChannels(channels, selectedWalletAddressesQuery)
        : searchChannels(channels, query);

    return filteredChannels.filter((c) => c.kind !== "dm").slice(0, 3);
  }, [channels, query, selectedWalletAddressesQuery]);

  return filteredChannels;
};

const useFilteredComboboxItems = (query, state) => {
  const deferredQuery = React.useDeferredValue(query.trim().toLowerCase());

  const selectedWalletAddresses = state.selectedKeys.map(getKeyItemIdentifier);

  const channels = useFilteredChannels(deferredQuery, {
    selectedWalletAddresses,
  });
  const accounts = useFilteredAccounts(deferredQuery);

  const items = React.useMemo(() => {
    const channelItems = channels.map((c) => ({
      key: `channel-${c.id}`,
      textValue: c.name ?? "untitled",
    }));

    const accountItems = accounts.map((a) => ({
      key: `account-${a.walletAddress}`,
      textValue: a.displayName ?? a.walletAddress,
    }));

    return [
      { key: "channels", title: "Channels", children: channelItems },
      { key: "accounts", title: "Accounts", children: accountItems },
    ].filter((s) => s.children.length !== 0);
  }, [channels, accounts]);

  return items;
};

const useTagFieldComboboxState = () => {
  const [{ selectedKeys, focusedIndex }, setState] = React.useState({
    selectedKeys: [],
    focusedIndex: -1,
  });

  const setSelection = React.useCallback(
    (keys) =>
      setState((s) => ({
        ...s,
        selectedKeys: typeof keys === "function" ? keys(s.selectedKeys) : keys,
      })),
    []
  );

  const clearFocus = React.useCallback(
    () => setState((s) => ({ ...s, focusedIndex: -1 })),
    []
  );

  const moveFocusLeft = React.useCallback(
    () =>
      setState(({ selectedKeys, focusedIndex }) => ({
        selectedKeys,
        focusedIndex:
          focusedIndex === -1
            ? selectedKeys.length - 1
            : Math.max(0, focusedIndex - 1),
      })),
    []
  );

  const moveFocusRight = React.useCallback(
    () =>
      setState(({ selectedKeys, focusedIndex }) => ({
        selectedKeys,
        focusedIndex:
          focusedIndex === -1 || focusedIndex === selectedKeys.length - 1
            ? -1
            : focusedIndex + 1,
      })),
    []
  );

  const focusIndex = React.useCallback(
    (i) => setState((s) => ({ ...s, focusedIndex: i })),
    []
  );

  const focusLast = React.useCallback(
    () =>
      setState(({ selectedKeys }) => ({
        selectedKeys,
        focusedIndex: selectedKeys.length - 1,
      })),
    []
  );

  const deselectFocusedKeyAndMoveFocusLeft = React.useCallback(
    () =>
      setState(({ selectedKeys, focusedIndex }) => ({
        selectedKeys: selectedKeys.filter((_, i) => i !== focusedIndex),
        focusedIndex: focusedIndex === 0 ? -1 : focusedIndex - 1,
      })),
    []
  );

  return {
    selectedKeys,
    setSelection,
    focusedIndex,
    focusIndex,
    focusLast,
    clearFocus,
    moveFocusLeft,
    moveFocusRight,
    deselectFocusedKeyAndMoveFocusLeft,
  };
};

const useTagFieldCombobox = ({ inputRef }, state) => {
  const { keyboardProps } = useKeyboard({
    onKeyDown: (e) => {
      const hasSelection = e.target.selectionStart != null;

      if (hasSelection) {
        const { selectionStart, selectionEnd } = e.target;
        const selectionIsCollapsed = selectionStart === selectionEnd;
        if (
          !selectionIsCollapsed ||
          selectionStart !== 0 ||
          state.selectedKeys.length === 0
        ) {
          e.continuePropagation();
          return;
        }
      }

      if (e.key === "ArrowLeft") {
        inputRef.current.focus();
        state.moveFocusLeft();
      } else if (e.key === "ArrowRight") {
        inputRef.current.focus();
        state.moveFocusRight();
      } else if (e.key === "Backspace") {
        inputRef.current.focus();
        if (state.focusedIndex === -1) {
          state.focusLast();
        } else {
          state.deselectFocusedKeyAndMoveFocusLeft();
        }
      } else {
        e.continuePropagation();
      }
    },
  });

  return {
    inputProps: keyboardProps,
    tagButtonProps: { ...keyboardProps, tabIndex: -1 },
  };
};

const NewMessageScreen = () => {
  const navigate = useNavigate();
  const messageInputRef = React.useRef();
  const { isFloating: isSidebarFloating } = useSidebarState();
  const actions = useActions();
  const recipientsState = useTagFieldComboboxState();
  const [isRecipientsCommitted, setRecipientsCommitted] = React.useState(false);
  const firstSelectedKeyType = getKeyItemType(recipientsState.selectedKeys[0]);
  const shouldMatchDm =
    recipientsState.selectedKeys.length === 1 &&
    firstSelectedKeyType === "account";

  const dmChannel = useDmChannelWithMember(
    shouldMatchDm ? getKeyItemIdentifier(recipientsState.selectedKeys[0]) : null
  );

  const selectedWalletAddresses = recipientsState.selectedKeys
    .filter((k) => getKeyItemType(k) === "account")
    .map(getKeyItemIdentifier);

  const selectedUsers = useUsers(selectedWalletAddresses);
  const selectedAccounts = selectedWalletAddresses.map(
    (a) =>
      selectedUsers.find((u) => u.walletAddress === a) ?? { walletAddress: a }
  );

  return (
    <div
      css={(t) =>
        css({
          flex: 1,
          background: t.colors.backgroundPrimary,
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          height: "100%",
        })
      }
    >
      <ChannelHeader>
        <div
          css={(t) =>
            css({
              fontSize: t.text.sizes.headerDefault,
              fontWeight: t.text.weights.header,
              color: t.colors.textHeader,
            })
          }
          style={{ paddingLeft: isSidebarFloating ? 0 : "1.6rem" }}
        >
          New Message
        </div>
      </ChannelHeader>
      <div
        css={css({
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "stretch",
          minHeight: 0,
          minWidth: 0,
        })}
      >
        <div css={css({ padding: "0 1.6rem" })}>
          {!isRecipientsCommitted ? (
            <MessageRecipientCombobox
              label="To:"
              ariaLabel="Message recipient search"
              placeholder="An ENS name, or Ethereum address"
              state={recipientsState}
              onSelect={(key) => {
                if (getKeyItemType(key) === "channel") {
                  setRecipientsCommitted(true);
                  messageInputRef.current.focus();
                }
              }}
              onBlur={() => {
                if (recipientsState.selectedKeys.length !== 0) {
                  setRecipientsCommitted(true);
                  messageInputRef.current.focus();
                }
              }}
            />
          ) : firstSelectedKeyType === "channel" ? (
            <MessageRecipientChannelHeader
              channelId={getKeyItemIdentifier(recipientsState.selectedKeys[0])}
              component="button"
              onClick={() => {
                setRecipientsCommitted(false);
              }}
            />
          ) : (
            <MessageRecipientAccountsHeader
              walletAddresses={recipientsState.selectedKeys.map(
                getKeyItemIdentifier
              )}
              component="button"
              onClick={() => {
                setRecipientsCommitted(false);
              }}
            />
          )}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ padding: "2rem 1.6rem" }}>
          <NewChannelMessageInput
            ref={messageInputRef}
            uploadImage={actions.uploadImage}
            submit={async (message) => {
              if (firstSelectedKeyType === "channel" || dmChannel != null) {
                const channelId =
                  dmChannel?.id ??
                  getKeyItemIdentifier(recipientsState.selectedKeys[0]);
                actions.createMessage({ channel: channelId, blocks: message });
                navigate(`/channels/${channelId}`);
                return;
              }

              const firstMemberNames = selectedAccounts
                .slice(0, 3)
                .map((a) => a.displayName ?? truncateAddress(a.walletAddress))
                .join(", ");

              const channel = await actions.createPrivateChannel({
                name:
                  selectedAccounts.length > 3
                    ? `${firstMemberNames}, ...`
                    : firstMemberNames,
                memberWalletAddresses: selectedWalletAddresses,
              });
              actions.createMessage({ channel: channel.id, blocks: message });
              navigate(`/channels/${channel.id}`);
            }}
            placeholder="Type your message..."
            members={selectedAccounts}
            submitDisabled={recipientsState.selectedKeys.length == 0}
          />
        </div>
      </div>
    </div>
  );
};

const MessageRecipientsInputContainer = React.forwardRef(
  ({ component: Component = "div", label, children, ...props }, ref) => (
    <Component
      ref={ref}
      css={(t) =>
        css({
          display: "flex",
          width: "100%",
          color: t.colors.inputPlaceholder,
          background: t.colors.backgroundTertiary,
          fontSize: t.text.sizes.channelMessages,
          borderRadius: "0.6rem",
          padding: "1.05rem 1.6rem",
          outline: "none",
          ":focus-visible": {
            filter: "brightness(1.05)",
            boxShadow: `0 0 0 0.2rem ${t.colors.primary}`,
          },
          "@media (hover: hover)": {
            ":not(:has(input))": {
              cursor: "pointer",
              ":hover": { filter: "brightness(1.05)" },
            },
          },
        })
      }
      {...props}
    >
      {label && (
        <div
          css={(t) =>
            css({ color: t.colors.inputPlaceholder, marginRight: "0.8rem" })
          }
        >
          {label}
        </div>
      )}
      {children}
    </Component>
  )
);

const MessageRecipientChannelHeader = ({ channelId, ...props }) => {
  const channelName = useChannelName(channelId);

  return (
    <MessageRecipientsInputContainer label="To:" {...props}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <ChannelAvatar
          id={channelId}
          size="2.4rem"
          style={{ marginRight: "0.5rem" }}
        />
        <div css={(t) => css({ color: t.colors.textNormal })}>
          {channelName}
        </div>
      </div>
    </MessageRecipientsInputContainer>
  );
};

const MessageRecipientAccountsHeader = ({ walletAddresses, ...props }) => {
  const users = useUsers(walletAddresses);
  const accounts = walletAddresses.map(
    (a) => users.find((u) => u.walletAddress === a) ?? { walletAddress: a }
  );

  return (
    <MessageRecipientsInputContainer
      label="To:"
      css={(t) =>
        css({
          display: "flex",
          alignItems: "center",
          color: t.colors.textNormal,
        })
      }
      {...props}
    >
      {accounts
        .map((a) => a.displayName ?? truncateAddress(a.walletAddress))
        .join(", ")}
    </MessageRecipientsInputContainer>
  );
};

const MessageRecipientCombobox = ({
  label,
  ariaLabel,
  placeholder,
  state,
  onSelect,
  onBlur,
}) => {
  const inputRef = React.useRef();
  const containerRef = React.useRef();

  const [query, setQuery] = React.useState("");
  const filteredComboboxItems = useFilteredComboboxItems(query, state);
  const { inputProps: tagFieldInputProps, tagButtonProps } =
    useTagFieldCombobox({ inputRef }, state);

  const { keyboardProps: inputKeyboardProps } = useKeyboard({
    onKeyDown: (e) => {
      if (e.key === "Escape" || e.key === "Tab") {
        state.clearFocus();
        setQuery("");
      } else {
        e.continuePropagation();
      }
    },
  });

  const { selectedKeys } = state;

  return (
    <MessageRecipientsInputContainer ref={containerRef} label={label}>
      <FlexGrid gridGap="0.5rem" css={css({ flex: 1, minWidth: 0 })}>
        {state.selectedKeys.map((key, i) => {
          const type = getKeyItemType(key);
          const identifier = getKeyItemIdentifier(key);

          const props = {
            isFocused: i === state.focusedIndex,
            focus: () => {
              inputRef.current.focus();
              state.focusIndex(i);
            },
            deselect: () => {
              inputRef.current.focus();
              state.setSelection((keys) => keys.filter((k) => k !== key));
            },
            ...tagButtonProps,
          };

          switch (type) {
            case "account":
              return (
                <FlexGridItem key={key}>
                  <SelectedAccountTag {...props} walletAddress={identifier} />
                </FlexGridItem>
              );
            case "channel":
              return (
                <FlexGridItem key={key}>
                  <SelectedChannelTag {...props} channelId={identifier} />
                </FlexGridItem>
              );
            default:
              throw new Error();
          }
        })}

        <FlexGridItem css={css({ flex: 1, minWidth: 0 })}>
          <Combobox
            aria-label={ariaLabel}
            autoFocus
            placeholder={
              state.selectedKeys.length === 0 ? placeholder : undefined
            }
            allowsCustomValue={false}
            // allowsCustomValue={true}
            selectedKey={null}
            onSelect={(key) => {
              if (key == null) return;

              setQuery("");

              switch (getKeyItemType(key)) {
                case "account":
                  state.setSelection((keys) => {
                    const nonChannelKeys = keys.filter(
                      (k) => getKeyItemType(k) !== "channel"
                    );
                    return [...nonChannelKeys, key];
                  });
                  break;

                // There should only ever be one selected channel at the time
                case "channel":
                  state.setSelection([key]);
                  break;

                default:
                  throw new Error();
              }

              onSelect(key);
            }}
            inputValue={query}
            onInputChange={setQuery}
            disabledKeys={state.selectedKeys}
            targetRef={containerRef}
            inputRef={inputRef}
            items={filteredComboboxItems}
            popoverMaxHeight={365}
            renderInput={({ inputRef, inputProps }) => (
              <input
                ref={inputRef}
                css={(t) =>
                  css({
                    color: t.colors.textNormal,
                    background: "none",
                    border: 0,
                    padding: 0,
                    width: "100%",
                    minWidth: "12rem",
                    outline: "none",
                    "::placeholder": {
                      color: t.colors.inputPlaceholder,
                    },
                  })
                }
                {...mergeProps(
                  {
                    onChange: () => {
                      state.clearFocus();
                    },
                    onClick: () => {
                      state.clearFocus();
                    },
                    onBlur: (e) => {
                      if (
                        e.relatedTarget != null &&
                        containerRef.current.contains(e.relatedTarget)
                      )
                        return;

                      setQuery("");
                      state.clearFocus();
                      onBlur(e);
                    },
                  },
                  inputProps,
                  tagFieldInputProps,
                  inputKeyboardProps
                )}
              />
            )}
            renderListbox={({ state, listBoxRef, listBoxProps }) => (
              <MessageRecipientListBox
                ref={listBoxRef}
                listBoxProps={listBoxProps}
                state={state}
                selectedKeys={selectedKeys}
              />
            )}
          >
            {(item) => (
              <ComboboxSection
                key={item.key}
                items={item.children}
                title={item.title}
              >
                {(item) => (
                  <ComboboxItem key={item.key} textValue={item.textValue} />
                )}
              </ComboboxSection>
            )}
          </Combobox>
        </FlexGridItem>
      </FlexGrid>
    </MessageRecipientsInputContainer>
  );
};

const Tag = ({ label, isFocused, focus, deselect, ...props }) => (
  <button
    data-focused={isFocused ? "true" : undefined}
    css={(t) =>
      css({
        display: "flex",
        alignItems: "center",
        border: 0,
        lineHeight: "inherit",
        borderRadius: "0.3rem",
        padding: "0 0.2rem",
        fontWeight: "500",
        outline: "none",
        cursor: "pointer",
        color: t.colors.mentionText,
        background: t.colors.mentionBackground,
        "&[data-focused]": {
          position: "relative",
          zIndex: 1,
          boxShadow: `0 0 0 0.2rem ${t.colors.mentionFocusBorder}`,
          textDecoration: "none",
          "[data-deselect-button]": { color: t.colors.textAccent },
        },
        "@media (hover: hover)": {
          "&:hover": {
            color: t.colors.mentionTextModifierHover,
            background: t.colors.mentionBackgroundModifierHover,
            textDecoration: "none",
          },
        },
      })
    }
    onFocus={() => {
      focus();
    }}
    {...props}
  >
    {label}
    <IconButton
      data-deselect-button
      component="div"
      role="button"
      size="1.8rem"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        deselect();
      }}
      style={{ marginLeft: "0.2rem" }}
      css={(t) =>
        css({
          color: "inherit",
          "@media (hover: hover)": {
            ":hover": {
              color: t.colors.textAccent,
              backdropFilter: "brightness(1.5) saturate(1.25)",
            },
          },
        })
      }
    >
      <CrossSmallIcon style={{ width: "0.9rem", height: "auto" }} />
    </IconButton>
  </button>
);

const SelectedAccountTag = ({ walletAddress, ...props }) => {
  const user = useUserWithWalletAddress(walletAddress);
  const label = user?.displayName ?? truncateAddress(walletAddress);
  return <Tag label={label} {...props} />;
};

const SelectedChannelTag = ({ channelId, ...props }) => {
  const name = useChannelName(channelId);
  return <Tag label={name} {...props} />;
};

const MessageRecipientListBox = React.forwardRef(
  ({ state, listBoxProps: listBoxPropsInput, selectedKeys }, ref) => {
    const { listBoxProps } = useListBox(listBoxPropsInput, state, ref);

    return (
      <ul
        ref={ref}
        css={(t) =>
          css({
            display: "block",
            padding: t.dropdownMenus.padding,
            listStyle: "none",
            "li:not(:last-of-type)": { marginBottom: "0.2rem" },
          })
        }
        {...listBoxProps}
      >
        {[...state.collection].map((item) => {
          if (item.type === "section")
            return (
              <MessageRecipientComboboxSection
                key={item.key}
                state={state}
                item={item}
                selectedKeys={selectedKeys}
              />
            );

          return (
            <MessageRecipientComboboxOption
              key={item.key}
              state={state}
              item={item}
              isSelected={selectedKeys.includes(item.key)}
            />
          );
        })}
      </ul>
    );
  }
);

const MessageRecipientComboboxOption = ({ item, state, isSelected }) => {
  const props = {
    itemKey: item.key,
    state,
    isSelected,
  };

  const type = getKeyItemType(item.key);

  switch (type) {
    case "account":
      return (
        <MessageRecipientComboboxAccountOption
          identifier={item.key}
          {...props}
        />
      );
    case "channel":
      return (
        <MessageRecipientComboboxChannelOption
          identifier={item.key}
          {...props}
        />
      );
    default:
      throw new Error();
  }
};

const MessageRecipientOption = ({
  itemKey,
  state,
  isSelected,
  label,
  description,
  icon,
}) => {
  const ref = React.useRef();

  const { optionProps, labelProps, descriptionProps, isFocused, isDisabled } =
    useOption({ key: itemKey }, state, ref);

  const theme = useTheme();

  return (
    <li
      {...optionProps}
      ref={ref}
      css={(t) =>
        css({
          minHeight: t.dropdownMenus.itemHeight,
          padding: "0.8rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          lineHeight: 1.4,
          fontWeight: "400",
          color: t.colors.textNormal,
          borderRadius: "0.3rem",
          outline: "none",
        })
      }
      style={{
        cursor: isDisabled ? "default" : "pointer",
        background: isSelected
          ? theme.colors.primaryTransparentDark
          : isFocused
          ? theme.colors.backgroundModifierHover
          : undefined,
      }}
    >
      <div
        css={css({
          marginRight: "1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        })}
      >
        {icon}
      </div>
      <div
        css={css({
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
        })}
      >
        <div
          {...labelProps}
          css={(t) => css({ fontSize: t.text.sizes.channelMessages })}
          style={{ color: isFocused ? theme.colors.textAccent : undefined }}
        >
          {label}
        </div>
        {description != null && (
          <div
            {...descriptionProps}
            css={(t) =>
              css({
                color: t.colors.inputPlaceholder,
                fontSize: t.fontSizes.default,
                flex: 1,
                minWidth: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                marginLeft: "0.8rem",
              })
            }
          >
            {description}
          </div>
        )}
        {isSelected && (
          <div css={css({ padding: "0 0.5rem" })}>
            <CheckmarkIcon style={{ width: "1.2rem" }} />
          </div>
        )}
      </div>
    </li>
  );
};
const MessageRecipientComboboxSection = ({
  item: section,
  state,
  selectedKeys,
}) => {
  const { itemProps, headingProps, groupProps } = useListBoxSection({
    heading: section.rendered,
  });

  // const isAtTop = section.key === state.collection.getFirstKey();

  return (
    <li {...itemProps}>
      <div
        {...headingProps}
        css={(t) =>
          css({
            fontSize: t.fontSizes.small,
            fontWeight: "600",
            color: t.colors.textDimmedAlpha,
            padding: "0.5rem 0.8rem",
          })
        }
      >
        {section.rendered}
      </div>
      <ul {...groupProps}>
        {[...section.childNodes].map((node) => (
          <MessageRecipientComboboxOption
            key={node.key}
            item={node}
            state={state}
            isSelected={selectedKeys.includes(node.key)}
          />
        ))}
      </ul>
    </li>
  );
};

const MessageRecipientComboboxAccountOption = ({
  itemKey,
  state,
  isSelected,
}) => {
  const walletAddress = getKeyItemIdentifier(itemKey);
  const user = useUserWithWalletAddress(walletAddress) ?? { walletAddress };

  const address = truncateAddress(user.walletAddress);
  const name = user.displayName ?? address;
  const description = name != address ? address : null;

  return (
    <MessageRecipientOption
      itemKey={itemKey}
      state={state}
      isSelected={isSelected}
      label={name}
      description={description}
      icon={<UserAvatar size="2.4rem" walletAddress={user.walletAddress} />}
    />
  );
};

const MessageRecipientComboboxChannelOption = ({
  itemKey,
  state,
  isSelected,
}) => {
  const channelId = getKeyItemIdentifier(itemKey);
  const channel = useChannel(channelId, { name: true });

  return (
    <MessageRecipientOption
      itemKey={itemKey}
      state={state}
      isSelected={isSelected}
      label={channel.name}
      description={channel.description}
      icon={<ChannelAvatar size="2.4rem" id={channel.id} />}
    />
  );
};

export default NewMessageScreen;