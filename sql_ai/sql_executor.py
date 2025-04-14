# sql_executor.py - Enhanced functionality

from typing import Dict, List, Optional, Any, Union
import re
import random
from datetime import datetime, timedelta

class SQLExecutor:
    def __init__(self):
        # Mock database schemas for simulation
        self.mock_schemas = {
            "users": {
                "columns": {
                    "id": "INT PRIMARY KEY",
                    "username": "VARCHAR(50)",
                    "email": "VARCHAR(100)",
                    "password": "VARCHAR(255)",
                    "created_at": "TIMESTAMP"
                },
                "data": self._generate_user_data(20)
            },
            "products": {
                "columns": {
                    "id": "INT PRIMARY KEY",
                    "name": "VARCHAR(100)",
                    "description": "TEXT",
                    "price": "DECIMAL(10,2)",
                    "stock": "INT",
                    "category_id": "INT"
                },
                "data": self._generate_product_data(30)
            },
            "orders": {
                "columns": {
                    "id": "INT PRIMARY KEY",
                    "user_id": "INT",
                    "total": "DECIMAL(10,2)",
                    "status": "VARCHAR(20)",
                    "created_at": "TIMESTAMP"
                },
                "data": self._generate_order_data(50)
            },
            "categories": {
                "columns": {
                    "id": "INT PRIMARY KEY",
                    "name": "VARCHAR(50)",
                    "parent_id": "INT NULL"
                },
                "data": self._generate_category_data(10)
            }
        }

    def execute_query(self, query: str, db_type: str) -> Dict[str, Any]:
        """
        Execute SQL query and return results
        This is a mock implementation that simulates query execution
        """
        query = query.strip()
        query_lower = query.lower()
        
        try:
            # Handle different query types
            if query_lower.startswith("select"):
                return self._handle_select_query(query)
            elif query_lower.startswith("create table"):
                return self._handle_create_table_query(query)
            elif query_lower.startswith("insert"):
                return self._handle_insert_query(query)
            elif query_lower.startswith("update"):
                return self._handle_update_query(query)
            elif query_lower.startswith("delete"):
                return self._handle_delete_query(query)
            elif query_lower.startswith("alter table"):
                return self._handle_alter_table_query(query)
            elif query_lower.startswith("drop table"):
                return self._handle_drop_table_query(query)
            else:
                return {
                    "success": True,
                    "command": "UNKNOWN",
                    "message": "Query executed successfully"
                }
        except Exception as e:
            return {
                "success": False,
                "command": "ERROR",
                "message": f"Error executing query: {str(e)}"
            }
    
    def get_database_structure(self) -> Dict[str, Any]:
        """Return the structure of the mock database"""
        structure = {}
        for table_name, table_info in self.mock_schemas.items():
            columns = []
            for col_name, col_type in table_info["columns"].items():
                constraints = []
                if "PRIMARY KEY" in col_type:
                    constraints.append("PRIMARY KEY")
                if "NOT NULL" in col_type:
                    constraints.append("NOT NULL")
                    
                base_type = col_type.split(" ")[0]
                columns.append({
                    "name": col_name,
                    "dataType": base_type,
                    "constraints": constraints
                })
            
            structure[table_name] = {
                "name": table_name,
                "columns": columns,
                "rowCount": len(table_info["data"])
            }
        
        return structure
    
    def _handle_select_query(self, query: str) -> Dict[str, Any]:
        """Handle SELECT queries"""
        # Very basic query parser (just for demonstration)
        query_lower = query.lower()
        
        # Extract table names from the query
        from_match = re.search(r"from\s+([a-z0-9_,\s]+)(?:where|order by|group by|limit|$)", query_lower)
        if not from_match:
            return {
                "success": False,
                "command": "SELECT",
                "message": "Invalid SELECT query - could not determine tables"
            }
            
        tables_str = from_match.group(1).strip()
        tables = [t.strip() for t in tables_str.split(",")]
        
        # Get primary table
        primary_table = tables[0]
        
        # Check if table exists
        if primary_table not in self.mock_schemas:
            return {
                "success": False,
                "command": "SELECT",
                "message": f"Table '{primary_table}' does not exist"
            }
        
        # Extract columns to select
        columns_match = re.search(r"select\s+(.+?)\s+from", query_lower)
        if not columns_match:
            return {
                "success": False,
                "command": "SELECT",
                "message": "Invalid SELECT query - could not determine columns"
            }
            
        columns_str = columns_match.group(1).strip()
        
        # Handle * case
        if columns_str == "*":
            selected_columns = list(self.mock_schemas[primary_table]["columns"].keys())
        else:
            selected_columns = [c.strip() for c in columns_str.split(",")]
            
            # Validate columns exist
            for col in selected_columns:
                if col not in self.mock_schemas[primary_table]["columns"]:
                    return {
                        "success": False,
                        "command": "SELECT",
                        "message": f"Column '{col}' does not exist in table '{primary_table}'"
                    }
        
        # Extract LIMIT clause if present
        limit = None
        limit_match = re.search(r"limit\s+(\d+)", query_lower)
        if limit_match:
            limit = int(limit_match.group(1))
        
        # Get data from mock table
        data = self.mock_schemas[primary_table]["data"]
        
        # Apply limit if needed
        if limit is not None:
            data = data[:limit]
        
        # Filter columns
        result_rows = []
        for row in data:
            result_row = {}
            for col in selected_columns:
                if col in row:
                    result_row[col] = row[col]
            result_rows.append(result_row)
        
        return {
            "success": True,
            "command": "SELECT",
            "rows": result_rows,
            "fields": selected_columns,
            "rowCount": len(result_rows)
        }
    
    def _handle_create_table_query(self, query: str) -> Dict[str, Any]:
        """Handle CREATE TABLE queries"""
        # Extract table name
        table_match = re.search(r"create\s+table\s+([a-z0-9_]+)", query.lower())
        if not table_match:
            return {
                "success": False,
                "command": "CREATE TABLE",
                "message": "Invalid CREATE TABLE syntax - could not determine table name"
            }
            
        table_name = table_match.group(1).strip()
        
        # In a mock implementation, we just acknowledge the creation
        return {
            "success": True,
            "command": "CREATE TABLE",
            "message": f"Table '{table_name}' created successfully"
        }
    
    def _handle_insert_query(self, query: str) -> Dict[str, Any]:
        """Handle INSERT queries"""
        # Extract table name
        table_match = re.search(r"insert\s+into\s+([a-z0-9_]+)", query.lower())
        if not table_match:
            return {
                "success": False,
                "command": "INSERT",
                "message": "Invalid INSERT syntax - could not determine table name"
            }
            
        table_name = table_match.group(1).strip()
        
        # In a mock implementation, we just acknowledge the insertion
        return {
            "success": True,
            "command": "INSERT",
            "message": f"1 row inserted into '{table_name}' successfully"
        }
    
    def _handle_update_query(self, query: str) -> Dict[str, Any]:
        """Handle UPDATE queries"""
        # Extract table name
        table_match = re.search(r"update\s+([a-z0-9_]+)", query.lower())
        if not table_match:
            return {
                "success": False,
                "command": "UPDATE",
                "message": "Invalid UPDATE syntax - could not determine table name"
            }
            
        table_name = table_match.group(1).strip()
        
        # In a mock implementation, we just acknowledge the update
        return {
            "success": True,
            "command": "UPDATE",
            "message": f"5 rows updated in '{table_name}' successfully"
        }
    
    def _handle_delete_query(self, query: str) -> Dict[str, Any]:
        """Handle DELETE queries"""
        # Extract table name
        table_match = re.search(r"delete\s+from\s+([a-z0-9_]+)", query.lower())
        if not table_match:
            return {
                "success": False,
                "command": "DELETE",
                "message": "Invalid DELETE syntax - could not determine table name"
            }
            
        table_name = table_match.group(1).strip()
        
        # In a mock implementation, we just acknowledge the deletion
        return {
            "success": True,
            "command": "DELETE",
            "message": f"3 rows deleted from '{table_name}' successfully"
        }
    
    def _handle_alter_table_query(self, query: str) -> Dict[str, Any]:
        """Handle ALTER TABLE queries"""
        # Extract table name
        table_match = re.search(r"alter\s+table\s+([a-z0-9_]+)", query.lower())
        if not table_match:
            return {
                "success": False,
                "command": "ALTER TABLE",
                "message": "Invalid ALTER TABLE syntax - could not determine table name"
            }
            
        table_name = table_match.group(1).strip()
        
        # In a mock implementation, we just acknowledge the alteration
        return {
            "success": True,
            "command": "ALTER TABLE",
            "message": f"Table '{table_name}' altered successfully"
        }
    
    def _handle_drop_table_query(self, query: str) -> Dict[str, Any]:
        """Handle DROP TABLE queries"""
        # Extract table name
        table_match = re.search(r"drop\s+table\s+([a-z0-9_]+)", query.lower())
        if not table_match:
            return {
                "success": False,
                "command": "DROP TABLE",
                "message": "Invalid DROP TABLE syntax - could not determine table name"
            }
            
        table_name = table_match.group(1).strip()
        
        # In a mock implementation, we just acknowledge the drop
        return {
            "success": True,
            "command": "DROP TABLE",
            "message": f"Table '{table_name}' dropped successfully"
        }
    
    def _generate_user_data(self, count: int) -> List[Dict[str, Any]]:
        """Generate mock user data"""
        users = []
        for i in range(1, count + 1):
            users.append({
                "id": i,
                "username": f"user{i}",
                "email": f"user{i}@example.com",
                "password": f"hashed_password_{i}",
                "created_at": (datetime.now() - timedelta(days=random.randint(1, 365))).isoformat()
            })
        return users
    
    def _generate_product_data(self, count: int) -> List[Dict[str, Any]]:
        """Generate mock product data"""
        products = []
        categories = [1, 2, 3, 4, 5]
        
        for i in range(1, count + 1):
            products.append({
                "id": i,
                "name": f"Product {i}",
                "description": f"This is a description for product {i}",
                "price": round(10.0 + i * 1.5, 2),
                "stock": random.randint(0, 100),
                "category_id": random.choice(categories)
            })
        return products
    
    def _generate_order_data(self, count: int) -> List[Dict[str, Any]]:
        """Generate mock order data"""
        orders = []
        statuses = ["pending", "processing", "shipped", "delivered", "cancelled"]
        
        for i in range(1, count + 1):
            orders.append({
                "id": i,
                "user_id": random.randint(1, 10),
                "total": round(50.0 + random.random() * 200, 2),
                "status": random.choice(statuses),
                "created_at": (datetime.now() - timedelta(days=random.randint(1, 60))).isoformat()
            })
        return orders
    
    def _generate_category_data(self, count: int) -> List[Dict[str, Any]]:
        """Generate mock category data"""
        categories = []
        
        for i in range(1, count + 1):
            parent_id = None
            if i > 3:  # Make some categories child categories
                parent_id = random.randint(1, 3)
                
            categories.append({
                "id": i,
                "name": f"Category {i}",
                "parent_id": parent_id
            })
        return categories