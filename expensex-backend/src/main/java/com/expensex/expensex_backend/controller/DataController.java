package com.expensex.expensex_backend.controller;

import com.expensex.expensex_backend.expenseData.UserExpenseData;
import com.expensex.expensex_backend.repository.UserExpenseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/data")
@CrossOrigin(origins = {"http://127.0.0.1:5500", "http://localhost:5500", "*"})
public class DataController {

    @Autowired
    private UserExpenseRepository repository;

    @GetMapping("/{userKey}")
    public ResponseEntity<UserExpenseData> getData(@PathVariable String userKey) {
        UserExpenseData data = repository.findById(userKey).orElse(new UserExpenseData());
        return ResponseEntity.ok(data);
    }

    @PostMapping("/{userKey}")
    public ResponseEntity<String> saveData(@PathVariable String userKey, @RequestBody UserExpenseData incomingData) {
        incomingData.setUserKey(userKey);
        repository.save(incomingData);
        return ResponseEntity.ok("Saved successfully!");
    }
}