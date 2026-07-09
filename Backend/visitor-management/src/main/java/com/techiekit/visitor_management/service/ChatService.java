package com.techiekit.visitor_management.service;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.techiekit.visitor_management.dto.ChatChannelResponse;
import com.techiekit.visitor_management.dto.ChatContactResponse;
import com.techiekit.visitor_management.dto.ChatConversationSummary;
import com.techiekit.visitor_management.dto.ChatMessageResponse;
import com.techiekit.visitor_management.entity.ChatChannel;
import com.techiekit.visitor_management.entity.ChatMessage;
import com.techiekit.visitor_management.rbac.PermissionCatalog;
import com.techiekit.visitor_management.repository.ChatChannelRepository;
import com.techiekit.visitor_management.repository.ChatMessageRepository;
import com.techiekit.visitor_management.repository.UserRepository;

/**
 * Chat business logic: builds the contact/channel lists, persists messages and pushes them to the
 * right STOMP destinations. Channel encoding lives here (see {@link ChatMessage}).
 */
@Service
public class ChatService {

	private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter
			.ofPattern("MMM dd, yyyy hh:mm a", Locale.ENGLISH).withZone(ZoneOffset.UTC);

	private final ChatMessageRepository chatMessageRepository;
	private final ChatChannelRepository chatChannelRepository;
	private final UserRepository userRepository;
	private final StaffUserService staffUserService;
	private final FileStorageService fileStorageService;
	private final SimpMessagingTemplate messagingTemplate;

	public ChatService(ChatMessageRepository chatMessageRepository, ChatChannelRepository chatChannelRepository,
			UserRepository userRepository, StaffUserService staffUserService,
			FileStorageService fileStorageService,
			SimpMessagingTemplate messagingTemplate) {
		this.chatMessageRepository = chatMessageRepository;
		this.chatChannelRepository = chatChannelRepository;
		this.userRepository = userRepository;
		this.fileStorageService = fileStorageService;
		this.staffUserService = staffUserService;
		this.messagingTemplate = messagingTemplate;
	}

	@Transactional(readOnly = true)
	public List<ChatContactResponse> contacts(String callerUsername) {
		return userRepository.findAll().stream()
				.filter(u -> u.getUsername() != null && !u.getUsername().equalsIgnoreCase(callerUsername))
				.sorted(Comparator.comparing(u -> displayName(u.getName(), u.getUsername()).toLowerCase(Locale.ROOT)))
				.map(u -> new ChatContactResponse(u.getUsername(), displayName(u.getName(), u.getUsername()),
						u.getRole()))
				.toList();
	}

	@Transactional(readOnly = true)
	public List<ChatChannelResponse> channelsFor(String callerUsername, String role) {
		var channels = new ArrayList<ChatChannelResponse>();
		channels.add(new ChatChannelResponse("all", "All Staff", "/topic/chat/all"));

		var roles = new LinkedHashSet<String>();
		if (PermissionCatalog.isAdmin(role)) {
			userRepository.findAll().forEach(u -> {
				if (u.getRole() != null && !u.getRole().isBlank()) {
					roles.add(u.getRole());
				}
			});
		} else if (role != null && !role.isBlank()) {
			roles.add(role);
		}
		for (var r : roles) {
			channels.add(new ChatChannelResponse("role:" + r, prettyRole(r) + " Team", "/topic/chat/role/" + r));
		}

		// Admin-created channels: admins see all, everyone else only the ones they're a member of.
		var custom = PermissionCatalog.isAdmin(role)
				? chatChannelRepository.findAllByOrderByNameAsc()
				: chatChannelRepository.findByMember(callerUsername == null ? "" : callerUsername);
		custom.forEach(c ->
				channels.add(new ChatChannelResponse("custom:" + c.getId(), c.getName(), "/topic/chat/custom/" + c.getId())));
		return channels;
	}

	@Transactional
	public ChatChannelResponse createCustomChannel(String name, String creator, List<String> members) {
		var trimmed = name == null ? "" : name.trim();
		if (trimmed.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Channel name is required");
		}
		if (trimmed.length() > 80) {
			trimmed = trimmed.substring(0, 80);
		}
		if (chatChannelRepository.existsByNameIgnoreCase(trimmed)) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "A channel with that name already exists");
		}
		var channel = new ChatChannel();
		channel.setName(trimmed);
		channel.setCreatedBy(creator);
		channel.setMembers(normalizeMembers(members));
		var saved = chatChannelRepository.save(channel);
		notifyChannelsChanged();
		return new ChatChannelResponse("custom:" + saved.getId(), saved.getName(), "/topic/chat/custom/" + saved.getId());
	}

	@Transactional
	public void deleteCustomChannel(long id) {
		if (!chatChannelRepository.existsById(id)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Channel not found");
		}
		chatChannelRepository.deleteById(id);
		notifyChannelsChanged();
	}

	@Transactional(readOnly = true)
	public List<ChatContactResponse> channelMembers(long id, String callerUsername, String callerRole) {
		var channel = chatChannelRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Channel not found"));
		// Members (and admins) may view who's in the channel.
		if (!PermissionCatalog.isAdmin(callerRole) && !chatChannelRepository.isMember(id, callerUsername)) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a member of this channel");
		}
		return channel.getMembers().stream()
				.map(username -> userRepository.findByUsernameIgnoreCase(username).orElse(null))
				.filter(u -> u != null)
				.sorted(Comparator.comparing(u -> displayName(u.getName(), u.getUsername()).toLowerCase(Locale.ROOT)))
				.map(u -> new ChatContactResponse(u.getUsername(), displayName(u.getName(), u.getUsername()), u.getRole()))
				.toList();
	}

	@Transactional
	public void setChannelMembers(long id, List<String> members) {
		var channel = chatChannelRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Channel not found"));
		channel.setMembers(normalizeMembers(members));
		chatChannelRepository.save(channel);
		notifyChannelsChanged();
	}

	private Set<String> normalizeMembers(List<String> members) {
		var out = new LinkedHashSet<String>();
		if (members != null) {
			for (var m : members) {
				if (m != null && !m.isBlank()) {
					out.add(m.trim().toLowerCase(Locale.ROOT));
				}
			}
		}
		return out;
	}

	/**
	 * Set the membership of a role channel by reassigning roles: every username in {@code members}
	 * is promoted to {@code role}; anyone currently in {@code role} but not listed is demoted to
	 * EMPLOYEE. Self/admin changes are skipped (changeRole guards them). Admin-only at the controller.
	 */
	@Transactional
	public void setRoleChannelMembers(String role, List<String> members) {
		var target = role == null ? "" : role.trim();
		if (target.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role is required");
		}
		var desired = new LinkedHashSet<String>();
		if (members != null) {
			members.forEach(m -> {
				if (m != null && !m.isBlank()) {
					desired.add(m.trim().toLowerCase(Locale.ROOT));
				}
			});
		}

		// Promote everyone selected.
		for (var username : desired) {
			tryChangeRole(username, target);
		}
		// Demote anyone currently in this role who was unselected.
		userRepository.findAll().stream()
				.filter(u -> u.getRole() != null && u.getRole().equalsIgnoreCase(target))
				.filter(u -> u.getUsername() != null && !desired.contains(u.getUsername().toLowerCase(Locale.ROOT)))
				.forEach(u -> tryChangeRole(u.getUsername(), "EMPLOYEE"));

		notifyChannelsChanged();
	}

	private void tryChangeRole(String username, String roleTitle) {
		try {
			staffUserService.changeRole(username, roleTitle);
		} catch (ResponseStatusException e) {
			// Skip protected cases (self, admin demotion, unknown user) without failing the batch.
		}
	}

	/** Tell every connected client to refresh its channel list (new/removed channel). */
	private void notifyChannelsChanged() {
		messagingTemplate.convertAndSend("/topic/chat/system", java.util.Map.of("type", "channels-updated"));
	}

	@Transactional(readOnly = true)
	public List<ChatConversationSummary> conversations(String callerUsername, String callerRole) {
		var out = new ArrayList<ChatConversationSummary>();

		// Channels the caller can see, with their last message.
		for (var ch : channelsFor(callerUsername, callerRole)) {
			var last = chatMessageRepository.findTop1ByChannelOrderByCreatedAtDesc(ch.key());
			out.add(new ChatConversationSummary(ch.key(), "channel", ch.label(), null,
					last == null ? null : last.getBody(),
					last == null ? null : last.getSenderName(),
					last == null ? null : last.getSenderUsername(),
					last == null ? null : DATE_FORMAT.format(last.getCreatedAt()),
					last == null ? 0L : last.getCreatedAt().toEpochMilli()));
		}

		// Direct-message conversations that have at least one message, last message each.
		var lower = callerUsername == null ? "" : callerUsername.toLowerCase(Locale.ROOT);
		var seen = new HashSet<String>();
		for (var m : chatMessageRepository.findDmMessagesForUser(lower)) {
			if (!seen.add(m.getChannel())) {
				continue; // already captured the newest (query is desc)
			}
			var other = otherParticipant(m.getChannel(), lower);
			var user = userRepository.findByUsernameIgnoreCase(other).orElse(null);
			var label = user != null ? displayName(user.getName(), user.getUsername()) : other;
			var otherUsername = user != null ? user.getUsername() : other;
			out.add(new ChatConversationSummary(m.getChannel(), "dm", label, otherUsername,
					m.getBody(), m.getSenderName(), m.getSenderUsername(),
					DATE_FORMAT.format(m.getCreatedAt()), m.getCreatedAt().toEpochMilli()));
		}
		return out;
	}

	@Transactional(readOnly = true)
	public List<ChatMessageResponse> history(String channel, String callerUsername, String callerRole) {
		var normalized = normalizeChannel(channel);
		requireAccess(normalized, callerUsername, callerRole);
		var rows = chatMessageRepository.findTop50ByChannelOrderByCreatedAtDesc(normalized);
		var out = new ArrayList<ChatMessageResponse>(rows.size());
		// repository returns newest-first; flip to chronological for display
		for (var i = rows.size() - 1; i >= 0; i--) {
			out.add(toResponse(rows.get(i)));
		}
		return out;
	}

	@Transactional
	public ChatMessageResponse send(String channel, String body, String callerUsername, String callerRole) {
		var normalized = normalizeChannel(channel);
		requireAccess(normalized, callerUsername, callerRole);
		var text = body == null ? "" : body.trim();
		if (text.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message cannot be empty");
		}
		if (com.techiekit.visitor_management.util.ContentModeration.isProhibited(text)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
					"Message blocked: it appears to contain inappropriate content.");
		}
		if (text.length() > 4000) {
			text = text.substring(0, 4000);
		}

		var entity = new ChatMessage();
		entity.setChannel(normalized);
		entity.setSenderUsername(callerUsername);
		entity.setSenderName(senderName(callerUsername));
		entity.setBody(text);
		var saved = chatMessageRepository.save(entity);
		var response = toResponse(saved);

		dispatch(normalized, response);
		return response;
	}

	/** Record a call-log entry (e.g. "Voice call · 2:34") in the DM between caller and peer. */
	@Transactional
	public ChatMessageResponse logCall(String peerUsername, String text, String callerUsername, String callerRole) {
		if (peerUsername == null || peerUsername.isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "peerUsername is required");
		}
		var channel = dmChannel(callerUsername, peerUsername);
		requireAccess(channel, callerUsername, callerRole);

		var entity = new ChatMessage();
		entity.setChannel(channel);
		entity.setSenderUsername(callerUsername);
		entity.setSenderName(senderName(callerUsername));
		entity.setBody(text == null || text.isBlank() ? "Call" : text.trim());
		entity.setMessageType("CALL");
		var saved = chatMessageRepository.save(entity);
		var response = toResponse(saved);

		dispatch(channel, response);
		return response;
	}

	/** Send a message with a file attachment (photo/document) and an optional caption ({@code body}). */
	@Transactional
	public ChatMessageResponse sendWithAttachment(String channel, String body,
			org.springframework.web.multipart.MultipartFile file, String callerUsername, String callerRole) {
		var normalized = normalizeChannel(channel);
		requireAccess(normalized, callerUsername, callerRole);
		if (file == null || file.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No file uploaded");
		}
		var caption = body == null ? "" : body.trim();
		if (com.techiekit.visitor_management.util.ContentModeration.isProhibited(caption)
				|| com.techiekit.visitor_management.util.ContentModeration.isProhibited(file.getOriginalFilename())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
					"Upload blocked: it appears to contain inappropriate content.");
		}
		var url = fileStorageService.storeFile(file, "chat");
		var text = caption;
		if (text.length() > 4000) {
			text = text.substring(0, 4000);
		}

		var entity = new ChatMessage();
		entity.setChannel(normalized);
		entity.setSenderUsername(callerUsername);
		entity.setSenderName(senderName(callerUsername));
		entity.setBody(text);
		entity.setAttachmentUrl(url);
		entity.setAttachmentName(cleanFilename(file.getOriginalFilename()));
		entity.setAttachmentType(file.getContentType());
		entity.setAttachmentSize(file.getSize());
		var saved = chatMessageRepository.save(entity);
		var response = toResponse(saved);

		dispatch(normalized, response);
		return response;
	}

	private static String cleanFilename(String name) {
		if (name == null || name.isBlank()) {
			return "file";
		}
		var base = name.replace("\\", "/");
		var slash = base.lastIndexOf('/');
		return slash >= 0 ? base.substring(slash + 1) : base;
	}

	private void dispatch(String channel, Object payload) {
		if (channel.startsWith("dm:")) {
			for (var participant : dmParticipants(channel)) {
				// The channel key is lower-cased; routing must use the principal's real-cased
				// username, so resolve it back from the user table.
				var target = userRepository.findByUsernameIgnoreCase(participant)
						.map(u -> u.getUsername()).orElse(participant);
				messagingTemplate.convertAndSendToUser(target, "/queue/chat", payload);
			}
		} else if (channel.equals("all")) {
			messagingTemplate.convertAndSend("/topic/chat/all", payload);
		} else if (channel.startsWith("role:")) {
			messagingTemplate.convertAndSend("/topic/chat/role/" + channel.substring("role:".length()), payload);
		} else if (channel.startsWith("custom:")) {
			messagingTemplate.convertAndSend("/topic/chat/custom/" + channel.substring("custom:".length()), payload);
		}
	}

	/** Delete a message for everyone. Allowed for the sender or any admin; broadcasts a removal
	 *  notice ({@code {deleted:true, id, channel}}) on the same destination as the message. */
	@Transactional
	public void deleteMessage(long id, String callerUsername, String callerRole) {
		var message = chatMessageRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found"));
		var isOwner = message.getSenderUsername() != null
				&& message.getSenderUsername().equalsIgnoreCase(callerUsername);
		if (!isOwner && !PermissionCatalog.isAdmin(callerRole)) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only delete your own messages");
		}
		var channel = message.getChannel();
		chatMessageRepository.deleteById(id);
		dispatch(channel, java.util.Map.of("deleted", true, "id", id, "channel", channel));
	}

	// ---- authorization & channel helpers ----

	private void requireAccess(String channel, String callerUsername, String callerRole) {
		if (channel.equals("all")) {
			return;
		}
		if (channel.startsWith("role:")) {
			var channelRole = channel.substring("role:".length());
			if (PermissionCatalog.isAdmin(callerRole) || channelRole.equalsIgnoreCase(callerRole)) {
				return;
			}
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a member of this channel");
		}
		if (channel.startsWith("custom:")) {
			try {
				var id = Long.parseLong(channel.substring("custom:".length()));
				if (!chatChannelRepository.existsById(id)) {
					throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Channel not found");
				}
				if (PermissionCatalog.isAdmin(callerRole) || chatChannelRepository.isMember(id, callerUsername)) {
					return;
				}
				throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a member of this channel");
			} catch (NumberFormatException ignored) {
				throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Channel not found");
			}
		}
		if (channel.startsWith("dm:")) {
			for (var participant : dmParticipants(channel)) {
				if (participant.equalsIgnoreCase(callerUsername)) {
					return;
				}
			}
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a participant of this conversation");
		}
		throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown channel");
	}

	private String normalizeChannel(String channel) {
		var c = channel == null ? "" : channel.trim();
		if (c.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "channel is required");
		}
		if (c.startsWith("dm:")) {
			var parts = c.substring("dm:".length()).split("\\|");
			if (parts.length != 2 || parts[0].isBlank() || parts[1].isBlank()) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid direct-message channel");
			}
			return dmChannel(parts[0].trim(), parts[1].trim());
		}
		return c;
	}

	/** Canonical DM channel key: usernames lower-cased and sorted so (a,b) == (b,a). */
	public static String dmChannel(String a, String b) {
		var x = a.toLowerCase(Locale.ROOT);
		var y = b.toLowerCase(Locale.ROOT);
		return x.compareTo(y) <= 0 ? "dm:" + x + "|" + y : "dm:" + y + "|" + x;
	}

	private List<String> dmParticipants(String channel) {
		var parts = channel.substring("dm:".length()).split("\\|");
		return List.of(parts[0], parts[1]);
	}

	/** The other (lower-cased) username in a DM channel, given the caller's lower-cased username. */
	private String otherParticipant(String channel, String me) {
		for (var p : dmParticipants(channel)) {
			if (!p.equalsIgnoreCase(me)) {
				return p;
			}
		}
		return me; // self-conversation fallback
	}

	private String senderName(String username) {
		return userRepository.findByUsernameIgnoreCase(username)
				.map(u -> displayName(u.getName(), u.getUsername()))
				.orElse(username);
	}

	private static String displayName(String name, String username) {
		return name != null && !name.isBlank() ? name : username;
	}

	private static String prettyRole(String role) {
		if (role == null || role.isBlank()) {
			return "";
		}
		var lower = role.toLowerCase(Locale.ROOT);
		return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
	}

	private ChatMessageResponse toResponse(ChatMessage m) {
		return new ChatMessageResponse(m.getId(), m.getChannel(), m.getSenderUsername(), m.getSenderName(),
				m.getBody(), m.getMessageType(), m.getAttachmentUrl(), m.getAttachmentName(), m.getAttachmentType(),
				m.getAttachmentSize(), DATE_FORMAT.format(m.getCreatedAt()));
	}
}
