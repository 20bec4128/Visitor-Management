package com.techiekit.visitor_management.dto;

import java.util.List;

/** A WebRTC ICE server entry, shaped to be passed straight into the browser's RTCPeerConnection. */
public record IceServer(List<String> urls, String username, String credential) {
}
