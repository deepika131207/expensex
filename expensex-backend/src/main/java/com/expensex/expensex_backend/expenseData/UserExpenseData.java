package com.expensex.expensex_backend.expenseData;

import jakarta.persistence.*;

@Entity
@Table(name = "user_expense_data")
public class UserExpenseData {

    @Id
    @Column(nullable = false, unique = true)
    private String userKey;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String expenses;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String budgets;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String categories;

    public UserExpenseData() {}

    public String getUserKey() { return userKey; }
    public void setUserKey(String userKey) { this.userKey = userKey; }

    public String getExpenses() { return expenses; }
    public void setExpenses(String expenses) { this.expenses = expenses; }

    public String getBudgets() { return budgets; }
    public void setBudgets(String budgets) { this.budgets = budgets; }

    public String getCategories() { return categories; }
    public void setCategories(String categories) { this.categories = categories; }
}