package com.wc.controller;

import com.wc.domain.DefiningObjective;
import com.wc.domain.Outcome;
import com.wc.domain.RallyCry;
import com.wc.dto.OutcomeRefDto;
import com.wc.repository.DefiningObjectiveRepository;
import com.wc.repository.OutcomeRepository;
import com.wc.repository.RallyCryRepository;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/outcomes")
public class OutcomeController {

    private final OutcomeRepository outcomes;
    private final DefiningObjectiveRepository definingObjectives;
    private final RallyCryRepository rallyCries;

    public OutcomeController(OutcomeRepository outcomes,
                              DefiningObjectiveRepository definingObjectives,
                              RallyCryRepository rallyCries) {
        this.outcomes = outcomes;
        this.definingObjectives = definingObjectives;
        this.rallyCries = rallyCries;
    }

    @GetMapping
    public Page<OutcomeRefDto> list(
            @PageableDefault(size = 50, sort = "priorityTier", direction = Sort.Direction.ASC) Pageable pageable) {
        Pageable capped = PageRequest.of(
                pageable.getPageNumber(),
                Math.min(pageable.getPageSize(), 500),
                pageable.getSort());
        Page<Outcome> page = outcomes.findAll(capped);

        // Hydrate parent labels in bulk (no N+1)
        var doIds = page.getContent().stream().map(Outcome::getDefiningObjectiveId).distinct().toList();
        Map<Long, DefiningObjective> doMap = new HashMap<>();
        definingObjectives.findAllById(doIds).forEach(d -> doMap.put(d.getId(), d));

        var rcIds = doMap.values().stream().map(DefiningObjective::getRallyCryId).distinct().toList();
        Map<Long, RallyCry> rcMap = new HashMap<>();
        rallyCries.findAllById(rcIds).forEach(rc -> rcMap.put(rc.getId(), rc));

        return page.map(o -> {
            DefiningObjective d = doMap.get(o.getDefiningObjectiveId());
            RallyCry rc = d == null ? null : rcMap.get(d.getRallyCryId());
            return new OutcomeRefDto(
                    o.getId(),
                    o.getTitle(),
                    o.getPriorityTier(),
                    d == null ? null : d.getId(),
                    d == null ? null : d.getTitle(),
                    rc == null ? null : rc.getId(),
                    rc == null ? null : rc.getTitle());
        });
    }
}
