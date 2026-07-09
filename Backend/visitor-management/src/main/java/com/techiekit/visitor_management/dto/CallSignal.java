package com.techiekit.visitor_management.dto;

/**
 * A WebRTC signaling message relayed between two users over STOMP.
 * {@code type} is one of: invite, accept, reject, hangup, offer, answer, ice.
 * {@code mode} is "video" or "audio". {@code payload} carries the SDP/ICE candidate as-is.
 */
public record CallSignal(String type, String to, String from, String fromName, String mode, Object payload) {
}
