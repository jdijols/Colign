package com.wc.controller;

import com.wc.dto.ChessTagDto;
import com.wc.repository.ChessTagRepository;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/chess-tags")
public class ChessTagController {

    private final ChessTagRepository chessTags;

    public ChessTagController(ChessTagRepository chessTags) {
        this.chessTags = chessTags;
    }

    @GetMapping
    public List<ChessTagDto> list() {
        return chessTags.findAllByOrderByPriorityRankAsc().stream()
                .map(t -> new ChessTagDto(t.getId(), t.getCode(), t.getLabel(), t.getPriorityRank()))
                .toList();
    }
}
