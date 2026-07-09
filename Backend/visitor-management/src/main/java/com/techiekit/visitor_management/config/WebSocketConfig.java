package com.techiekit.visitor_management.config;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import com.techiekit.visitor_management.rbac.StompAuthChannelInterceptor;

/**
 * STOMP-over-WebSocket transport used by chat, SOS broadcasts and WebRTC call signaling. The
 * handshake is authenticated by {@link StompAuthChannelInterceptor} using the existing bearer
 * token (no Spring Security). Broker is in-memory (single-instance only).
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

	private final StompAuthChannelInterceptor stompAuthChannelInterceptor;

	@Value("${app.frontend.url:http://localhost:5173}")
	private String frontendUrl;

	@Value("${app.frontend.urls:}")
	private String frontendUrls;

	public WebSocketConfig(StompAuthChannelInterceptor stompAuthChannelInterceptor) {
		this.stompAuthChannelInterceptor = stompAuthChannelInterceptor;
	}

	@Override
	public void configureMessageBroker(MessageBrokerRegistry registry) {
		registry.enableSimpleBroker("/topic", "/queue");
		registry.setApplicationDestinationPrefixes("/app");
		registry.setUserDestinationPrefix("/user");
	}

	@Override
	public void registerStompEndpoints(StompEndpointRegistry registry) {
		registry.addEndpoint("/ws")
				.setAllowedOriginPatterns(originPatterns())
				.withSockJS();
	}

	@Override
	public void configureClientInboundChannel(ChannelRegistration registration) {
		registration.interceptors(stompAuthChannelInterceptor);
	}

	private String[] originPatterns() {
		var patterns = new ArrayList<String>();
		patterns.addAll(splitCsv(frontendUrl));
		patterns.addAll(splitCsv(frontendUrls));
		patterns.add("http://localhost:*");
		patterns.add("http://127.0.0.1:*");
		return patterns.toArray(String[]::new);
	}

	private static List<String> splitCsv(String csv) {
		var out = new ArrayList<String>();
		if (csv == null) {
			return out;
		}
		for (var part : csv.split(",")) {
			if (part == null) {
				continue;
			}
			var trimmed = part.trim();
			if (!trimmed.isEmpty()) {
				out.add(trimmed);
			}
		}
		return out;
	}
}
