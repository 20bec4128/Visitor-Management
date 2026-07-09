package com.techiekit.visitor_management.service;

import java.security.Principal;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

/**
 * Tracks which users have a live WebSocket connection (online) and broadcasts the set on every
 * change to {@code /topic/presence}. A user may have several tabs, so connections are ref-counted.
 */
@Service
public class PresenceService {

	private final SimpMessagingTemplate messagingTemplate;
	private final ConcurrentHashMap<String, Integer> connectionsByUser = new ConcurrentHashMap<>();

	public PresenceService(SimpMessagingTemplate messagingTemplate) {
		this.messagingTemplate = messagingTemplate;
	}

	@EventListener
	public void onConnect(SessionConnectedEvent event) {
		var name = nameOf(event.getUser());
		if (name == null) {
			return;
		}
		connectionsByUser.merge(name, 1, Integer::sum);
		broadcast();
	}

	@EventListener
	public void onDisconnect(SessionDisconnectEvent event) {
		var name = nameOf(event.getUser());
		if (name == null) {
			return;
		}
		connectionsByUser.computeIfPresent(name, (k, count) -> count <= 1 ? null : count - 1);
		broadcast();
	}

	public List<String> online() {
		return new ArrayList<>(connectionsByUser.keySet());
	}

	private void broadcast() {
		messagingTemplate.convertAndSend("/topic/presence", online());
	}

	private static String nameOf(Principal principal) {
		return principal == null ? null : principal.getName();
	}
}
