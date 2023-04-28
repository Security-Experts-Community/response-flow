import { AppCommand } from "../AppCommand";
import {ApplicationStore, ErmackContent} from "@/store/StoreTypes";

export class LoadErmack extends AppCommand {

  /**
   * The application's settings.
   */
  private _settings: ErmackContent;

  constructor(context: ApplicationStore, ermackContent: ErmackContent) {
    super(context);
    this._settings = ermackContent;
  }


  /**
   * Executes the command.
   */
  public execute(): void {
    this._context.ermackContent = this._settings;
  }

}
