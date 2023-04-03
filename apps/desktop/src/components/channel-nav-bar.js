import React from "react";
import { useSearchParams } from "react-router-dom";
import { css, useTheme } from "@emotion/react";
import {
  useAuth,
  useActions,
  useMe,
  useChannel,
  useIsChannelStarred,
  useChannelHasOpenReadAccess,
} from "@shades/common/app";
import { useWallet, useWalletLogin } from "@shades/common/wallet";
import {
  array as arrayUtils,
  ethereum as ethereumUtils,
  user as userUtils,
} from "@shades/common/utils";
import Button from "@shades/ui-web/button";
import Dialog from "@shades/ui-web/dialog";
import {
  Star as StarIcon,
  StrokedStar as StrokedStarIcon,
  Globe as GlobeIcon,
} from "@shades/ui-web/icons";
import Spinner from "./spinner";
import NavBar from "./nav-bar";
import UserAvatar from "./user-avatar";
import ChannelAvatar from "./channel-avatar";
import * as Tooltip from "./tooltip";
import ChannelInfoDialog from "./channel-info-dialog";
import AddChannelMemberDialog from "./add-channel-member-dialog";

const { sort } = arrayUtils;
const { truncateAddress } = ethereumUtils;

const ChannelNavBar = ({ noSideMenu, channelId }) => {
  const [searchParams] = useSearchParams();
  const theme = useTheme();

  const actions = useActions();
  const { status: authenticationStatus } = useAuth();

  const me = useMe();
  const channel = useChannel(channelId, { name: true, members: true });
  const isChannelStarred = useIsChannelStarred(channelId);
  const hasOpenReadAccess = useChannelHasOpenReadAccess(channelId);

  const {
    connect: connectWallet,
    // cancel: cancelWalletConnectionAttempt,
    // canConnect: canConnectWallet,
    accountAddress: walletAccountAddress,
    accountEnsName,
    // chain,
    isConnecting: isConnectingWallet,
    // error: walletError,
    // switchToEthereumMainnet,
  } = useWallet();

  const {
    login,
    status: loginStatus,
    // error: loginError
  } = useWalletLogin();

  const [channelDialogMode, setChannelDialogMode] = React.useState(null);
  const [isAddMemberDialogOpen, setAddMemberDialogOpen] = React.useState(false);

  const isChannelDialogOpen = channelDialogMode != null;
  const isFetchingMembers = channel?.members.some(
    (m) => m.walletAddress == null
  );
  const isEmbedded = searchParams.get("mode") === "embedded";
  const hasPendingWalletAction =
    isConnectingWallet || loginStatus === "requesting-signature";

  if (channel == null) return <NavBar noSideMenu={noSideMenu} />;

  const isChannelOwner = me != null && channel.ownerUserId === me.id;

  const renderRightColumn = () => {
    if (authenticationStatus === "not-authenticated" && hasPendingWalletAction)
      return (
        <div
          css={(theme) =>
            css({
              display: "flex",
              color: theme.colors.textDimmed,
              paddingLeft: "0.5rem",
            })
          }
        >
          Check your wallet...
          <Spinner size="1.8rem" style={{ marginLeft: "1rem" }} />
        </div>
      );

    return (
      <div
        css={css({
          display: "grid",
          gridAutoFlow: "column",
          gridAutoColumns: "auto",
          gridGap: "0.4rem",
          alignItems: "center",
        })}
      >
        <button
          onClick={() => {
            const tryStarChannel = async () => {
              if (authenticationStatus !== "authenticated") {
                if (walletAccountAddress == null) {
                  alert(
                    "You need to connect and verify your account to star channels."
                  );
                  return;
                }

                if (
                  !confirm(
                    `You need to verify your account to star channels. Press ok to verify "${truncateAddress(
                      walletAccountAddress
                    )}" with wallet signature.`
                  )
                )
                  return;
                await login(walletAccountAddress);
              }

              if (isChannelStarred) {
                actions.unstarChannel(channel.id);
                return;
              }

              await actions.starChannel(channel.id);

              if (isEmbedded)
                window.open(
                  `${window.location.origin}/channels/${channel.id}`,
                  "_blank"
                );
            };

            tryStarChannel();
          }}
          css={(t) =>
            css({
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "0.3rem",
              width: "3.3rem",
              height: "2.8rem",
              padding: 0,
              transition: "background 20ms ease-in",
              outline: "none",
              ":hover": {
                background: t.colors.backgroundModifierHover,
              },
              ":focus-visible": {
                boxShadow: `0 0 0 0.2rem ${t.colors.primary}`,
              },
            })
          }
        >
          {isChannelStarred ? (
            <StarIcon style={{ color: "rgb(202, 152, 73)" }} />
          ) : (
            <StrokedStarIcon />
          )}
        </button>

        {!isFetchingMembers && channel.members.length !== 0 && (
          <>
            <MembersDisplayButton
              onClick={() => {
                setChannelDialogMode("members");
              }}
              members={channel.members}
            />
            <Dialog
              isOpen={isChannelDialogOpen}
              onRequestClose={() => {
                setChannelDialogMode(null);
              }}
              height="min(calc(100% - 3rem), 82rem)"
            >
              {({ titleProps }) => (
                <ChannelInfoDialog
                  channelId={channelId}
                  initialTab={channelDialogMode}
                  members={channel.members}
                  titleProps={titleProps}
                  showAddMemberDialog={
                    channel.kind === "topic" && isChannelOwner
                      ? () => {
                          setAddMemberDialogOpen(true);
                        }
                      : null
                  }
                  dismiss={() => {
                    setChannelDialogMode(null);
                  }}
                />
              )}
            </Dialog>
          </>
        )}

        {hasOpenReadAccess && (
          <Tooltip.Root>
            <Tooltip.Trigger>
              <span>
                <GlobeIcon
                  css={(t) =>
                    css({ width: "2rem", color: t.colors.textNormal })
                  }
                />
              </span>
            </Tooltip.Trigger>
            <Tooltip.Content sideOffset={5}>
              Open read access
              <br />
              <span css={(t) => css({ color: t.colors.textDimmed })}>
                Messages can be read by anyone
              </span>
            </Tooltip.Content>
          </Tooltip.Root>
        )}

        <AddChannelMemberDialog
          channelId={channelId}
          isOpen={isAddMemberDialogOpen}
          onRequestClose={() => {
            setAddMemberDialogOpen(false);
          }}
        />

        {authenticationStatus === "not-authenticated" && (
          <span
            css={(theme) =>
              css({
                display: "flex",
                alignItems: "center",
                fontSize: theme.fontSizes.default,
                paddingLeft: "0.5rem",
                overflow: "hidden",
              })
            }
          >
            {walletAccountAddress == null ? (
              <Button
                size="small"
                variant={theme.name === "nouns.tv" ? "primary" : "default"}
                onClick={connectWallet}
              >
                Connect wallet
              </Button>
            ) : (
              <>
                {isEmbedded && (
                  <span
                    css={css({
                      flex: 1,
                      minWidth: 0,
                      userSelect: "text",
                      cursor: "default",
                      whiteSpace: "nowrap",
                      overflow: "auto",
                      marginRight: "1.2rem",
                    })}
                  >
                    <a
                      href={`https://etherscan.io/address/${walletAccountAddress}`}
                      rel="noreferrer"
                      target="_blank"
                      css={(theme) =>
                        css({
                          display: "inline-flex",
                          alignItems: "center",
                          color: theme.colors.link,
                          ":hover": {
                            color: theme.colors.linkModifiedHover,
                          },
                          ":hover [data-avatar]": { opacity: 0.9 },
                        })
                      }
                    >
                      {accountEnsName}{" "}
                      {accountEnsName == null ? (
                        truncateAddress(walletAccountAddress)
                      ) : (
                        <>({truncateAddress(walletAccountAddress)})</>
                      )}
                      <UserAvatar
                        data-avatar
                        transparent
                        walletAddress={walletAccountAddress}
                        size="2.6rem"
                        style={{ marginLeft: "0.5rem" }}
                      />
                    </a>
                  </span>
                )}

                <Button
                  size="small"
                  variant={theme.name === "nouns.tv" ? "primary" : "default"}
                  onClick={() => {
                    login(walletAccountAddress);
                  }}
                >
                  Verify account
                </Button>
              </>
            )}
          </span>
        )}
      </div>
    );
  };

  return (
    <NavBar noSideMenu={noSideMenu}>
      {channel.image != null && (
        <a
          href={channel.imageLarge}
          rel="noreferrer"
          target="_blank"
          css={(t) =>
            css({
              borderRadius: "50%",
              outline: "none",
              ":focus-visible": {
                boxShadow: `0 0 0 0.2rem ${t.colors.primary}`,
              },
            })
          }
          style={{ marginRight: "1.1rem" }}
        >
          <ChannelAvatar transparent id={channel.id} size="2.4rem" />
        </a>
      )}

      <div
        style={{
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
        }}
      >
        {!isEmbedded && (
          <Heading
            component="button"
            onClick={() => {
              setChannelDialogMode("about");
            }}
            css={(t) =>
              css({
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                cursor: "pointer",
                ":hover": { color: t.colors.textNormal },
              })
            }
          >
            {channel.name}
          </Heading>
        )}

        {channel.description != null && (
          <button
            onClick={() => {
              setChannelDialogMode("about");
            }}
            css={(t) =>
              css({
                flex: 1,
                minWidth: 0,
                color: t.colors.textHeaderSecondary,
                marginLeft: "1.1rem",
                padding: "0 1.1rem",
                borderLeft: "1px solid",
                borderColor: "hsl(0 0% 100% / 20%)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                userSelect: "text",
                cursor: "pointer",
                maxWidth: "100%",
                ":hover": { color: t.colors.textDimmedModifierHover },
              })
            }
          >
            {channel.description}
          </button>
        )}
      </div>

      {renderRightColumn()}
    </NavBar>
  );
};

const Heading = ({ component: Component = "div", children, ...props }) => (
  <Component
    css={(theme) =>
      css({
        fontSize: theme.fontSizes.headerDefault,
        fontWeight: theme.text.weights.header,
        color: theme.colors.textHeader,
        fontFamily: theme.fontStacks.headers,
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        userSelect: "text",
        cursor: "default",
      })
    }
    {...props}
  >
    {children}
  </Component>
);

const MembersDisplayButton = React.forwardRef(({ onClick, members }, ref) => {
  const theme = useTheme();
  const sortedMembers = React.useMemo(
    () => sort(userUtils.createDefaultComparator(), members),
    [members]
  );

  const memberCount = members.length;
  const onlineMemberCount = members.filter(
    (m) => m.onlineStatus === "online"
  ).length;

  const membersToDisplay = sortedMembers.slice(0, 3);

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          ref={ref}
          onClick={onClick}
          css={(t) =>
            css({
              display: "flex",
              alignItems: "center",
              padding: "0.2rem 0.6rem",
              height: "2.8rem",
              borderRadius: "0.3rem",
              outline: "none",
              cursor: "pointer",
              ":focus-visible": {
                boxShadow: `0 0 0 0.2rem ${t.colors.primary}`,
              },
              ":hover": { background: t.colors.backgroundModifierHover },
            })
          }
        >
          {membersToDisplay.map((user, i) => (
            <UserAvatar
              key={user.id}
              transparent
              background={theme.colors.backgroundTertiary}
              walletAddress={user?.walletAddress}
              size="2rem"
              css={(theme) =>
                css({
                  marginLeft: i === 0 ? 0 : "-0.4rem",
                  boxShadow: `0 0 0 0.2rem ${theme.colors.backgroundPrimary}`,
                  position: "relative",
                  zIndex: `calc(${i} * -1)`,
                  borderRadius: theme.avatars.borderRadius,
                })
              }
            />
          ))}

          <div
            css={(theme) =>
              css({
                marginLeft: "0.4rem",
                padding: "0 0.3rem",
                fontSize: theme.fontSizes.small,
                color: theme.colors.textHeaderSecondary,
              })
            }
          >
            {members.length}
          </div>
        </button>
      </Tooltip.Trigger>
      <Tooltip.Content sideOffset={5}>
        View all members of this channel
        <div css={(t) => css({ color: t.colors.textDimmed })}>
          {onlineMemberCount === memberCount
            ? "All members online"
            : `${onlineMemberCount} ${
                onlineMemberCount === 1 ? "member" : "members"
              } online`}
        </div>
      </Tooltip.Content>
    </Tooltip.Root>
  );
});

export default ChannelNavBar;