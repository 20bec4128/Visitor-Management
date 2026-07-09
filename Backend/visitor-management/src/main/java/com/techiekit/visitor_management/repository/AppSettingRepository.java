package com.techiekit.visitor_management.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.techiekit.visitor_management.entity.AppSetting;

public interface AppSettingRepository extends JpaRepository<AppSetting, String> {
}
