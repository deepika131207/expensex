package com.expensex.expensex_backend.repository;

import com.expensex.expensex_backend.expenseData.UserExpenseData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserExpenseRepository extends JpaRepository<UserExpenseData, String> {
}
