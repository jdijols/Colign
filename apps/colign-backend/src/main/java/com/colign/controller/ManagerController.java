package com.colign.controller;

import com.colign.domain.User;
import com.colign.dto.TeamMemberDto;
import com.colign.repository.PlanRepository;
import com.colign.repository.UserRepository;
import com.colign.service.PlanService;
import com.colign.service.UserResolver;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/manager")
public class ManagerController {

  private final UserResolver userResolver;
  private final UserRepository userRepo;
  private final PlanRepository planRepo;
  private final PlanService planService;

  public ManagerController(
      UserResolver userResolver,
      UserRepository userRepo,
      PlanRepository planRepo,
      PlanService planService) {
    this.userResolver = userResolver;
    this.userRepo = userRepo;
    this.planRepo = planRepo;
    this.planService = planService;
  }

  /**
   * Returns the current user's direct reports + each report's most-recent plan (or null if they
   * have no plan yet). Capped to a sane page size per the brief's 2000-record requirement; the FE
   * pages through with `?page=&size=&sort=`.
   */
  @GetMapping("/team")
  public Page<TeamMemberDto> team(
      @PageableDefault(size = 25, sort = "displayName", direction = Sort.Direction.ASC)
          Pageable pageable) {
    User me = userResolver.resolveCurrent();
    Pageable capped =
        PageRequest.of(
            pageable.getPageNumber(), Math.min(pageable.getPageSize(), 2000), pageable.getSort());
    Page<User> directs = userRepo.findByManagerId(me.getId(), capped);
    return directs.map(
        ic -> {
          var latest = planRepo.findFirstByUserIdOrderByWeekStartDateDesc(ic.getId()).orElse(null);
          return new TeamMemberDto(
              ic.getId(),
              ic.getEmail(),
              ic.getDisplayName(),
              ic.getRole().name(),
              ic.getAvatarUrl(),
              latest == null ? null : planService.toDto(latest));
        });
  }
}
