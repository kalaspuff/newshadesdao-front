import * as Haptics from "expo-haptics";
import React from "react";
import { View, Text, Image, Pressable, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { SvgXml, Path } from "react-native-svg";
import * as Shades from "@shades/common";
import useProfilePicture from "../hooks/profile-picture";

const { reverse } = Shades.utils.array;
const { useAppScope } = Shades.app;

const handleUnimplementedPress = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  Alert.alert("THOON");
};

const truncateAddress = (address) =>
  [address.slice(0, 5), address.slice(-3)].join("...");

const ChannelList = ({ navigation }) => {
  const { state } = useAppScope();

  const user = state.selectMe();
  const truncatedAddress =
    user?.walletAddress == null ? null : truncateAddress(user.walletAddress);

  const channels = state.selectMemberChannels();
  const starredChannels = state.selectStarredChannels();

  const [collapsedIds, setCollapsedIds] = React.useState([]);

  return (
    <View style={{ flex: 1, backgroundColor: "rgb(32,32,32)" }}>
      <SafeAreaView edges={["top", "left", "right"]}>
        <Pressable
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 16,
            paddingHorizontal: 20,
            backgroundColor: pressed ? "rgba(255, 255, 255, 0.055)" : undefined,
          })}
          onPress={handleUnimplementedPress}
        >
          <View
            style={{
              width: 30,
              height: 30,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 8,
            }}
          >
            <ProfilePicture user={user} size={26} />
          </View>
          <View>
            <Text
              style={{
                color: "white",
                fontSize: 18,
                fontWeight: "500",
              }}
            >
              {user?.displayName}
            </Text>
            {truncatedAddress !== user?.displayName && (
              <Text
                style={{
                  color: "gray",
                  fontSize: 14,
                  fontWeight: "500",
                  lineHeight: 18,
                }}
              >
                {truncatedAddress}
              </Text>
            )}
          </View>
        </Pressable>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ height: 6 }} />

        <ListItem
          icon={
            <View style={{ width: 16 }}>
              <Svg width="100%" height="100%" viewBox="0 0 14 14" fill="gray">
                <Path d="M5.92239093,0.540000021 C2.94055203,0.540000021 0.5,2.98052217 0.5,5.96238099 C0.5,8.9442199 2.94055203,11.384762 5.92239093,11.384762 C7.02329179,11.384762 8.05258749,11.0564678 8.91032559,10.4866744 L12.1460745,13.6802311 C12.5695899,14.1037465 13.2589477,14.1037465 13.6823635,13.6802311 C14.1058788,13.2567158 14.1058788,12.5730353 13.6823635,12.1495199 L10.4410368,8.95033558 C11.0107904,8.09259747 11.3447619,7.06329182 11.3447619,5.96238099 C11.3447619,2.98052217 8.90420992,0.540000021 5.92239093,0.540000021 Z M5.92239093,2.70895241 C7.7320027,2.70895241 9.17580956,4.15272939 9.17580956,5.96238099 C9.17580956,7.77201268 7.7320027,9.21581954 5.92239093,9.21581954 C4.11275925,9.21581954 2.66895239,7.77201268 2.66895239,5.96238099 C2.66895239,4.15272939 4.11275925,2.70895241 5.92239093,2.70895241 Z" />
              </Svg>
            </View>
          }
          title="Quick Find"
          onPress={handleUnimplementedPress}
        />
        <ListItem
          title="Discover"
          onPress={handleUnimplementedPress}
          icon={
            <View style={{ width: 16 }}>
              <Svg viewBox="0 0 16 16" fill="gray">
                <Path d="M8,0C3.582,0,0,3.582,0,8s3.582,8,8,8s8-3.582,8-8S12.418,0,8,0z M8,7L7.938,8h-1L7,7H5v2h1l1,1c0.313-0.333,1.021-1,2-1h1 l1,0.229C11.86,9.437,12.513,9.75,13,10v1l-0.938,1.407C10.993,13.393,9.569,14,8,14v-1l-1-1v-1l-2-1C4.018,9.547,3.25,8.938,3,8 L2.785,6c0-0.187,0.435-0.867,0.55-1L3.278,4.307C4.18,3.154,5.494,2.343,7,2.09V3.5L8,4c0.3,0,0.609-0.045,1-0.417 C9.382,3.22,9.719,3,10,3c0.698,0,1,0.208,1,1l-0.5,1h-0.311C9.612,5.279,9.261,5.506,9,6C8.749,6.475,8.475,6.773,8,7z M13,8 c-0.417-0.25-0.771-0.583-1-1V6l0.797-1.593C13.549,5.409,14,6.65,14,8c0,0.165-0.012,0.326-0.025,0.488L13,8z" />
              </Svg>
            </View>
          }
        />

        <View style={{ height: 24 }} />

        {starredChannels.length !== 0 && (
          <CollapsableSection
            title="Starred"
            expanded={!collapsedIds.includes("starred")}
            onToggleExpanded={() => {
              setCollapsedIds((ids) =>
                ids.includes("starred")
                  ? ids.filter((id) => id !== "starred")
                  : [...ids, "starred"]
              );
            }}
          >
            {starredChannels.map((c) => (
              <ChannelItem
                key={c.id}
                id={c.id}
                name={c.name}
                kind={c.kind}
                avatar={c.avatar}
                hasUnread={state.selectChannelHasUnread(c.id)}
                notificationCount={state.selectChannelMentionCount(c.id)}
                onPress={() => {
                  navigation.navigate("Channel", { channelId: c.id });
                }}
              />
            ))}
          </CollapsableSection>
        )}

        {channels.length !== 0 && (
          <CollapsableSection
            title="Channels"
            expanded={!collapsedIds.includes("channels")}
            onToggleExpanded={() => {
              setCollapsedIds((ids) =>
                ids.includes("channels")
                  ? ids.filter((id) => id !== "channels")
                  : [...ids, "channels"]
              );
            }}
          >
            {channels.map((c) => (
              <ChannelItem
                key={c.id}
                id={c.id}
                name={c.name}
                kind={c.kind}
                avatar={c.avatar}
                hasUnread={state.selectChannelHasUnread(c.id)}
                notificationCount={state.selectChannelMentionCount(c.id)}
                onPress={() => {
                  navigation.navigate("Channel", { channelId: c.id });
                }}
              />
            ))}
          </CollapsableSection>
        )}
      </ScrollView>
    </View>
  );
};

export const ChannelItem = ({
  id,
  name,
  avatar,
  kind,
  hasUnread,
  // notificationCount,
  onPress,
}) => {
  const { state } = useAppScope();
  const user = state.selectMe();

  const memberUsers = state.selectChannelMembers(id);
  const memberUsersExcludingMe = memberUsers.filter(
    (u) => user == null || u.id !== user.id
  );
  const isFetchingMembers = memberUsers.some((m) => m.walletAddress == null);

  return (
    <ListItem
      onPress={onPress}
      // notificationCount={notificationCount}
      title={
        <Text style={{ color: hasUnread ? "white" : undefined }}>{name}</Text>
      }
      icon={
        <View>
          {avatar != null || isFetchingMembers ? (
            <ProfilePicture size={26} url={avatar} />
          ) : kind === "dm" ? (
            <>
              {memberUsersExcludingMe.length <= 1 ? (
                <ProfilePicture
                  size={26}
                  user={memberUsersExcludingMe[0] ?? memberUsers[0]}
                />
              ) : (
                <View
                  style={{
                    width: 26,
                    height: 26,
                    position: "relative",
                  }}
                >
                  {reverse(memberUsersExcludingMe.slice(0, 2)).map(
                    (user, i) => (
                      <ProfilePicture
                        key={user.id}
                        user={user}
                        style={{
                          position: "absolute",
                          top: i === 0 ? 3 : 0,
                          left: i === 0 ? 3 : 0,
                          width: 23,
                          height: 23,
                          borderRadius: 11.5,
                        }}
                      />
                    )
                  )}
                </View>
              )}
            </>
          ) : (
            <ProfilePicture
              size={26}
              // Emojis: https://dev.to/acanimal/how-to-slice-or-get-symbols-from-a-unicode-string-with-emojis-in-javascript-lets-learn-how-javascript-represent-strings-h3a
              signature={[...name][0]}
            />
          )}
        </View>
      }
    />
  );
};

const CollapsableSection = ({
  title,
  expanded,
  onToggleExpanded,
  children,
}) => (
  <>
    <View
      style={{
        paddingRight: 8,
        paddingLeft: 22,
        height: 28,
        alignItems: "flex-start",
        justifyContent: "center",
      }}
    >
      <Pressable
        onPress={onToggleExpanded}
        style={({ pressed }) => ({
          paddingVertical: 2,
          paddingHorizontal: 5,
          marginLeft: -4,
          borderRadius: 3,
          backgroundColor: pressed ? "hsl(0,0%,16%)" : undefined,
        })}
      >
        {({ pressed }) => (
          <Text
            style={{
              fontSize: 15,
              lineHeight: 17,
              color: pressed
                ? "rgba(255, 255, 255, 0.565)"
                : "rgba(255, 255, 255, 0.282)",
              textTransform: "uppercase",
              fontWeight: "600",
              letterSpacing: 0.5,
            }}
          >
            {title}
          </Text>
        )}
      </Pressable>
    </View>

    {expanded && (
      <>
        {children}
        <View style={{ height: 32 }} />
      </>
    )}
  </>
);

const ListItem = ({
  icon,
  title,
  // notificationCount,
  disabled,
  ...props
}) => (
  <View
    style={{ paddingHorizontal: 4 }}
    //   & > *.active {
    //     background: ${theme.colors.backgroundModifierSelected};
    //   }
    //   & > *:not(.active):hover {
    //     background: ${theme.colors.backgroundModifierHover};
    //   }
    //   & > *.active {
    //     color: ${theme.colors.textNormal};
  >
    <Pressable
      {...props}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 3,
        paddingVertical: 2,
        paddingHorizontal: 18,
        height: 39,
        backgroundColor: pressed ? "rgba(255, 255, 255, 0.055)" : undefined,
      })}
    >
      {icon != null && (
        <View
          style={{
            width: 30,
            height: 26,
            marginRight: 6,
          }}
        >
          <View
            style={{
              color: disabled ? "rgba(255, 255, 255, 0.22)" : "gray",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
            }}
          >
            {icon}
          </View>
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "500",
            color: disabled ? "rgb(255, 255, 255, 0.28)" : "gray",
            lineHeight: 26,
          }}
        >
          {title}
        </Text>
      </View>
      {/* {notificationCount > 0 && <NotificationBadge count={notificationCount} />} */}
    </Pressable>
  </View>
);
const ProfilePicture = ({ size = 18, url, user, signature, style }) => {
  const profilePicture = useProfilePicture(user);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "rgba(255, 255, 255, 0.055)",
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      {url != null || profilePicture?.type === "url" ? (
        <Image
          source={{ uri: url ?? profilePicture.url }}
          style={{ width: "100%", height: "100%" }}
        />
      ) : profilePicture?.type === "svg-string" ? (
        <SvgXml xml={profilePicture.string} width="100%" height="100%" />
      ) : signature ? (
        <Text style={{ color: "gray", fontSize: 11 }}>
          {signature.toUpperCase()}
        </Text>
      ) : null}
    </View>
  );
};

export default ChannelList;