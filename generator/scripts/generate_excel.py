# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script includes functions that generate the Excel file from a SharePoint Excel file.
# These functions are intended to be invoked from the generate_survey.py script.
from office365.runtime.auth.authentication_context import AuthenticationContext
from office365.sharepoint.client_context import ClientContext
from office365.sharepoint.files.file import File


# Generate the excel file from the SharePoint file
def generate_excel(
    sharepoint_url,
    excel_input_file_path,
    excel_output_file_path,
    office365_username,
    office365_password,
):
    # Function to check if the .env file is correctly configured
    def check_env_var(var, env_var_name):
        if var is None:
            raise ValueError(f"{env_var_name} is not defined in the .env file")

    # Check if the .env file is correctly configured
    check_env_var(sharepoint_url, "SHAREPOINT_URL")
    check_env_var(excel_input_file_path, "EXCEL_FILE_PATH")
    check_env_var(office365_username, "OFFICE365_USERNAME_EMAIL")
    check_env_var(office365_password, "OFFICE365_PASSWORD")

    try:
        # Authenticate
        auth_ctx = AuthenticationContext(sharepoint_url)
        if auth_ctx.acquire_token_for_user(office365_username, office365_password):
            client_ctx = ClientContext(sharepoint_url, auth_ctx)

            # Download the file
            response = File.open_binary(client_ctx, excel_input_file_path)
            with open(excel_output_file_path, "wb") as local_file:
                local_file.write(response.content)

            print("Generate Excel file successfully")
        else:
            print(auth_ctx.get_last_error())
    except Exception as e:
        print(f"An error occurred with generateExcelScript: {e}")
        raise e
