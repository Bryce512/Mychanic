import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Card, { CardContent } from "./Card";
import { colors } from "../theme/colors";

interface User {
  id: string;
  email: string;
  firstName: string;
}

interface UserSearchResultsProps {
  filteredUsers: User[];
  selectedUser: User | null;
  loading: boolean;
  error: string | null;
  onSelectUser: (user: User) => void;
}

const UserSearchResults = React.memo(function UserSearchResults({
  filteredUsers,
  selectedUser,
  loading,
  error,
  onSelectUser,
}: UserSearchResultsProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const renderUserCard = useMemo(
    () => (user: User) => {
      const fullName = `${user.firstName}`.trim();
      const isSelected = selectedUser?.id === user.id;

      return (
        <TouchableOpacity
          key={user.id}
          style={styles.userCardTouchable}
          onPress={() => onSelectUser(user)}
          activeOpacity={0.7}
        >
          <Card
            style={
              isSelected
                ? { borderWidth: 2, borderColor: colors.primary[500] }
                : undefined
            }
          >
            <CardContent>
              <View style={styles.userRow}>
                <View style={styles.userInfo}>
                  <View
                    style={[
                      styles.userAvatar,
                      { backgroundColor: colors.primary[500] },
                    ]}
                  >
                    <Text style={styles.avatarText}>
                      {fullName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.userDetails}>
                    <Text
                      style={[
                        styles.userName,
                        { color: isDark ? colors.white : colors.gray[900] },
                      ]}
                    >
                      {fullName || "Car Owner"}
                    </Text>
                    <Text
                      style={[
                        styles.userEmail,
                        { color: isDark ? colors.gray[400] : colors.gray[600] },
                      ]}
                    >
                      {user.email}
                    </Text>
                  </View>
                </View>
                <Feather
                  name={isSelected ? "check-circle" : "circle"}
                  size={24}
                  color={isSelected ? colors.primary[500] : colors.gray[400]}
                />
              </View>
            </CardContent>
          </Card>
        </TouchableOpacity>
      );
    },
    [selectedUser, isDark]
  );

  if (loading && filteredUsers.length > 0) {
    return (
      <View
        style={[
          styles.reloadingContainer,
          {
            backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
          },
        ]}
      >
        <ActivityIndicator size="small" color={colors.primary[500]} />
        <Text
          style={[
            styles.reloadingText,
            { color: isDark ? colors.white : colors.gray[900] },
          ]}
        >
          Updating search...
        </Text>
      </View>
    );
  }

  if (error && filteredUsers.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Feather name="search" size={48} color={colors.gray[400]} />
        <Text
          style={[
            styles.emptyText,
            { color: isDark ? colors.gray[400] : colors.gray[600] },
          ]}
        >
          {error}
        </Text>
        <Text
          style={[
            styles.emptySubtext,
            { color: isDark ? colors.gray[500] : colors.gray[500] },
          ]}
        >
          Try searching by user email address
        </Text>
      </View>
    );
  }

  if (filteredUsers.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Feather name="search" size={48} color={colors.gray[400]} />
        <Text
          style={[
            styles.emptyText,
            { color: isDark ? colors.gray[400] : colors.gray[600] },
          ]}
        >
          No users found
        </Text>
        <Text
          style={[
            styles.emptySubtext,
            { color: isDark ? colors.gray[500] : colors.gray[500] },
          ]}
        >
          Search for users by their email address to share your vehicle
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.usersContainer}>
      {filteredUsers.map((user) => renderUserCard(user))}
    </View>
  );
});

const styles = StyleSheet.create({
  reloadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  reloadingText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    minHeight: 300,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  usersContainer: {
    gap: 12,
  },
  userCardTouchable: {
    marginBottom: 4,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.white,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    fontWeight: "400",
  },
});

export default UserSearchResults;
