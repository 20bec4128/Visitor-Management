package com.techiekit.visitor_management.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;

@Entity
@Table(name = "app_settings")
public class AppSetting {

	@Id
	@Column(name = "section")
	private String section;

	@Lob
	@Column(name = "value_json", columnDefinition = "text")
	private String valueJson;

	public AppSetting() {
	}

	public AppSetting(String section, String valueJson) {
		this.section = section;
		this.valueJson = valueJson;
	}

	public String getSection() {
		return section;
	}

	public void setSection(String section) {
		this.section = section;
	}

	public String getValueJson() {
		return valueJson;
	}

	public void setValueJson(String valueJson) {
		this.valueJson = valueJson;
	}
}
